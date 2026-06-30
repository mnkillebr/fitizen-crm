import { redirect } from "react-router"

import type { Route } from "./+types/invite.$token"
import { setPendingInvite } from "~/lib/invite-session.server"
import { googleSignInErrorMessages } from "~/lib/sign-in"
import { validateInviteByToken } from "../../models/invite.server"

function inviteErrorRedirect(outcome: string) {
  const errorMap: Record<string, keyof typeof googleSignInErrorMessages> = {
    invalid_invite: "invite_invalid",
    invite_expired: "invite_invalid",
    invite_used: "invite_invalid",
    email_mismatch: "invite_email_mismatch",
  }

  const error = errorMap[outcome] ?? "invite_invalid"
  return redirect(`/sign-in?error=${error}`)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const token = params.token

  if (!token) {
    return redirect("/sign-in?error=invite_invalid")
  }

  const result = await validateInviteByToken(token)

  if (!result.valid) {
    return inviteErrorRedirect(result.outcome)
  }

  const headers = await setPendingInvite(request, {
    inviteId: result.invite.id,
    role: result.invite.role,
  })

  return redirect(`/sign-in?role=${result.invite.role}`, { headers })
}

export default function InviteLanding() {
  return null
}
