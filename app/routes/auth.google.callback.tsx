import { redirect } from "react-router"

import type { Route } from "./+types/auth.google.callback"
import {
  exchangeGoogleAuthCode,
  verifyGoogleOAuthState,
} from "~/lib/google-oauth.server"
import {
  setPendingSignup,
} from "~/lib/invite-session.server"
import type { GoogleSignInErrorCode } from "~/lib/sign-in"
import { commitSession, getSession } from "~/lib/sessions"
import {
  logSignInAttempt,
  validateInviteById,
  type SignInAttemptOutcomeValue,
} from "../../models/invite.server"
import { getUserWithEmailAndProfileId } from "../../models/user.server"

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
      const session = await getSession(request.headers.get("cookie"))
      session.set("userId", existingUser.id)
      session.set("role", existingUser.role)
      session.unset("pendingSignup")
      session.unset("inviteId")
      session.unset("inviteRole")

      return redirect("/dashboard", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      })
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
