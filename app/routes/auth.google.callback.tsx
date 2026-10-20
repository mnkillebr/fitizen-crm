import { redirect } from "react-router"

import type { Route } from "./+types/auth.google.callback"
import {
  exchangeGoogleAuthCode,
  verifyGoogleOAuthState,
  type GoogleUserProfile,
} from "~/lib/google-oauth.server"
import {
  setPendingSignup,
} from "~/lib/invite-session.server"
import type { GoogleSignInErrorCode, SignInRole } from "~/lib/sign-in"
import { commitSession, getSession } from "~/lib/sessions"
import {
  logSignInAttempt,
  validateInviteById,
  type SignInAttemptOutcomeValue,
} from "../../models/invite.server"
import {
  appendGoogleProfileToUser,
  getGoogleProfileByUserId,
  getUserByEmail,
  getUserWithEmailAndProfileId,
} from "../../models/user.server"

function outcomeToError(outcome: SignInAttemptOutcomeValue): GoogleSignInErrorCode {
  switch (outcome) {
    case "email_mismatch":
      return "invite_email_mismatch"
    case "invalid_invite":
    case "invite_expired":
    case "invite_used":
      return "invite_invalid"
    case "no_invite":
    default:
      return "account_not_found"
  }
}

async function createSignedInRedirect(
  request: Request,
  user: { id: string; role: SignInRole }
) {
  const session = await getSession(request.headers.get("cookie"))
  session.set("userId", user.id)
  session.set("role", user.role)
  session.unset("pendingSignup")
  session.unset("inviteId")
  session.unset("inviteRole")

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  })
}

async function linkGoogleProfileAndSignIn(
  request: Request,
  user: { id: string; role: SignInRole },
  profile: GoogleUserProfile
) {
  await appendGoogleProfileToUser({
    userId: user.id,
    profileId: profile.id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    verifiedEmail: profile.verifiedEmail,
  })

  return createSignedInRedirect(request, user)
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return redirect("/sign-in?error=google_denied")
  }

  if (!code || !state) {
    return redirect("/sign-in?error=google_invalid")
  }

  const oauthState = verifyGoogleOAuthState(state)

  if (!oauthState) {
    return redirect("/sign-in?error=google_invalid_state")
  }

  const { role, inviteId } = oauthState

  try {
    const authResult = await exchangeGoogleAuthCode(code, role)
    const userData = await getUserWithEmailAndProfileId(
      authResult.profile.email,
      authResult.profile.id
    )
    const existingUser = userData[0]

    if (existingUser?.id) {
      return createSignedInRedirect(request, existingUser)
    }

    // Seeded users (e.g. admin) exist before any GoogleProfile row.
    // Link Google on first successful OAuth for that email.
    const usersByEmail = await getUserByEmail(authResult.profile.email)
    const userByEmail = usersByEmail[0]

    if (userByEmail?.id) {
      const existingProfiles = await getGoogleProfileByUserId(userByEmail.id)

      if (existingProfiles.length === 0) {
        return linkGoogleProfileAndSignIn(request, userByEmail, authResult.profile)
      }

      await logSignInAttempt({
        email: authResult.profile.email,
        googleProfileId: authResult.profile.id,
        attemptedRole: role,
        outcome: "no_invite",
      })

      return redirect(`/sign-in?role=${role}&error=account_not_found`)
    }

    if (!inviteId) {
      await logSignInAttempt({
        email: authResult.profile.email,
        googleProfileId: authResult.profile.id,
        attemptedRole: role,
        outcome: "no_invite",
      })

      return redirect(`/sign-in?role=${role}&error=account_not_found`)
    }

    const inviteResult = await validateInviteById(inviteId, {
      email: authResult.profile.email,
    })

    if (!inviteResult.valid) {
      await logSignInAttempt({
        email: authResult.profile.email,
        googleProfileId: authResult.profile.id,
        attemptedRole: role,
        inviteToken: inviteId,
        outcome: inviteResult.outcome,
      })

      return redirect(
        `/sign-in?role=${role}&error=${outcomeToError(inviteResult.outcome)}`
      )
    }

    if (inviteResult.invite.role !== role) {
      await logSignInAttempt({
        email: authResult.profile.email,
        googleProfileId: authResult.profile.id,
        attemptedRole: role,
        inviteToken: inviteId,
        outcome: "invalid_invite",
      })

      return redirect(`/sign-in?role=${role}&error=invite_invalid`)
    }

    const pendingHeaders = await setPendingSignup(request, {
      profile: authResult.profile,
      role,
      inviteId,
    })

    return redirect("/setup-profile", { headers: pendingHeaders })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Google OAuth callback failed:", error)
    }

    return redirect(`/sign-in?role=${role}&error=google_failed`)
  }
}

export default function GoogleAuthCallback() {
  return null
}
