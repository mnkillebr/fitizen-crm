import { redirect } from "react-router"

import { getSession } from "~/lib/sessions"
import type { SignInRole } from "~/lib/sign-in"
import { getUserById } from "../../models/user.server"

export type SessionUser = {
  id: string
  role: SignInRole
  firstName: string
  lastName: string
  email: string
}

export async function getSessionUser(
  request: Request
): Promise<SessionUser | null> {
  const session = await getSession(request.headers.get("cookie"))
  const userId = session.get("userId")
  const role = session.get("role")

  if (typeof userId !== "string" || (role !== "coach" && role !== "member")) {
    return null
  }

  const users = await getUserById(userId)
  const user = users[0]

  if (!user?.id) {
    return null
  }

  return {
    id: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  }
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getSessionUser(request)

  if (!user) {
    throw redirect("/sign-in")
  }

  return user
}

export async function requireRole(
  request: Request,
  role: SignInRole
): Promise<SessionUser> {
  const user = await requireUser(request)

  if (user.role !== role) {
    throw redirect(`/dashboard/${user.role}`)
  }

  return user
}
