import { Link, redirect } from "react-router"

import type { Route } from "./+types/pending-approval"
import { FitizenLogo } from "~/components/fitizen-logo"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireRole } from "~/lib/auth.server"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, "coach")

  if (user.approvedCoach) {
    throw redirect("/dashboard/coach")
  }

  return { user }
}

export default function PendingApproval() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <FitizenLogo />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Approval pending</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Your coach account is waiting for administrator approval. You will
              be able to access the dashboard once approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" asChild>
              <Link to="/logout">Sign out</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
