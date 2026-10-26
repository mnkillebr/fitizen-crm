import { redirect } from "react-router"

import {
  getPendingSignup,
  type PendingSignup,
} from "~/lib/invite-session.server"
import { commitSession, getSession } from "~/lib/sessions"
import type { SignInRole } from "~/lib/sign-in"
import {
  redeemInvite,
  validateInviteById,
  type InviteValidationResult,
} from "../../models/invite.server"

export function splitGoogleName(name: string): {
  firstName: string
  lastName: string
} {
  const parts = name.trim().split(/\s+/)

  if (parts.length === 0) {
    return { firstName: "", lastName: "" }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

export async function requirePendingSignupForRole(
  request: Request,
  expectedRole: SignInRole
): Promise<{
  pendingSignup: PendingSignup
  invite: Extract<InviteValidationResult, { valid: true }>["invite"]
}> {
  const pendingSignup = await getPendingSignup(request)

  if (!pendingSignup) {
    throw redirect("/sign-in?error=setup_required")
  }

  if (pendingSignup.role !== expectedRole) {
    throw redirect(
      pendingSignup.role === "coach"
        ? "/setup-profile/coach"
        : "/setup-profile/member"
    )
  }

  const inviteResult = await validateInviteById(pendingSignup.inviteId, {
    email: pendingSignup.profile.email,
  })

  if (!inviteResult.valid) {
    throw redirect("/sign-in?error=invite_invalid")
  }

  return { pendingSignup, invite: inviteResult.invite }
}

export async function completeSetupSession(
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

export async function redeemInviteOrRedirect(
  inviteId: string,
  userId: string
) {
  const redeemed = await redeemInvite(inviteId, userId)

  if (redeemed.length === 0) {
    throw redirect("/sign-in?error=invite_invalid")
  }

  return redeemed[0]
}
