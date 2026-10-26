import { redirect } from "react-router"

import type { Route } from "./+types/setup-profile"
import { getPendingSignup } from "~/lib/invite-session.server"

export async function loader({ request }: Route.LoaderArgs) {
  const pendingSignup = await getPendingSignup(request)

  if (!pendingSignup) {
    throw redirect("/sign-in?error=setup_required")
  }

  if (pendingSignup.role === "member") {
    throw redirect("/setup-profile/member")
  }

  throw redirect("/setup-profile/coach")
}

export default function SetupProfileRedirect() {
  return null
}
