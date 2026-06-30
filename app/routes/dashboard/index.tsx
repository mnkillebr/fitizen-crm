import { redirect } from "react-router"

import type { Route } from "./+types/index"
import { requireUser } from "~/lib/auth.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request)

  if (user.role === "coach" && !user.approvedCoach) {
    throw redirect("/pending-approval")
  }

  throw redirect(`/dashboard/${user.role}`)
}

export default function DashboardIndex() {
  return null
}
