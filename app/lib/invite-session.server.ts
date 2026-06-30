import type { GoogleUserProfile } from "~/lib/google-oauth.server"
import type { SignInRole } from "~/lib/sign-in"
import { getSession } from "~/lib/sessions"

export type PendingSignup = {
  profile: GoogleUserProfile
  role: SignInRole
  inviteId: string
}

export type PendingInvite = {
  inviteId: string
  role: SignInRole
}

export async function getPendingInvite(
  request: Request
): Promise<PendingInvite | null> {
  const session = await getSession(request.headers.get("cookie"))
  const inviteId = session.get("inviteId")
  const inviteRole = session.get("inviteRole")

  if (
    typeof inviteId !== "string" ||
    (inviteRole !== "coach" && inviteRole !== "member")
  ) {
    return null
  }

  return { inviteId, role: inviteRole }
}

export async function setPendingInvite(
  request: Request,
  invite: PendingInvite
): Promise<HeadersInit> {
  const session = await getSession(request.headers.get("cookie"))
  session.set("inviteId", invite.inviteId)
  session.set("inviteRole", invite.role)

  const { commitSession } = await import("~/lib/sessions")
  return { "Set-Cookie": await commitSession(session) }
}

export async function clearPendingInvite(
  request: Request
): Promise<HeadersInit> {
  const session = await getSession(request.headers.get("cookie"))
  session.unset("inviteId")
  session.unset("inviteRole")

  const { commitSession } = await import("~/lib/sessions")
  return { "Set-Cookie": await commitSession(session) }
}

export async function getPendingSignup(
  request: Request
): Promise<PendingSignup | null> {
  const session = await getSession(request.headers.get("cookie"))
  const raw = session.get("pendingSignup")

  if (typeof raw !== "string") {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as PendingSignup

    if (
      !parsed.profile?.email ||
      !parsed.profile?.id ||
      !parsed.inviteId ||
      (parsed.role !== "coach" && parsed.role !== "member")
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export async function setPendingSignup(
  request: Request,
  pendingSignup: PendingSignup
): Promise<HeadersInit> {
  const session = await getSession(request.headers.get("cookie"))
  session.set("pendingSignup", JSON.stringify(pendingSignup))
  session.unset("inviteId")
  session.unset("inviteRole")

  const { commitSession } = await import("~/lib/sessions")
  return { "Set-Cookie": await commitSession(session) }
}

export async function clearPendingSignup(
  request: Request
): Promise<HeadersInit> {
  const session = await getSession(request.headers.get("cookie"))
  session.unset("pendingSignup")

  const { commitSession } = await import("~/lib/sessions")
  return { "Set-Cookie": await commitSession(session) }
}
