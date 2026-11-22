import { redirect } from "react-router"

import type { Route } from "./+types/coach"
import { requireApprovedCoach } from "~/lib/auth.server"

export async function loader({ request }: Route.LoaderArgs) {
  await requireApprovedCoach(request)

  throw redirect("/dashboard/coach/clients")
}

export default function CoachDashboard() {
  return null
}
