import {
  BarbellIcon,
  ChartLineUpIcon,
  ChatCircleIcon,
} from "@phosphor-icons/react"
import { useOutletContext } from "react-router"

import type { Route } from "./+types/member"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireRole, type SessionUser } from "~/lib/auth.server"

const memberSections = [
  {
    icon: BarbellIcon,
    title: "Workouts",
    description: "View assigned sessions and log your training for the week.",
  },
  {
    icon: ChartLineUpIcon,
    title: "Progress",
    description: "Track measurements, PRs, and milestones over time.",
  },
  {
    icon: ChatCircleIcon,
    title: "Coach messages",
    description: "Stay connected with your coach between sessions.",
  },
] as const

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "member")

  return null
}

export default function MemberDashboard() {
  const { user } = useOutletContext<{ user: SessionUser }>()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {user.firstName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your member portal is ready. More features will appear here soon.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memberSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <section.icon className="size-5 text-primary" />
              <CardTitle className="text-lg">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
