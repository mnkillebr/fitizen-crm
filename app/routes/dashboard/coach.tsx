import {
  BarbellIcon,
  CalendarBlankIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { useOutletContext } from "react-router"

import type { Route } from "./+types/coach"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireRole, type SessionUser } from "~/lib/auth.server"

const coachSections = [
  {
    icon: UsersIcon,
    title: "Clients",
    description: "Review your roster, goals, and contact details in one place.",
  },
  {
    icon: BarbellIcon,
    title: "Programs",
    description: "Build and assign training plans as your clients progress.",
  },
  {
    icon: CalendarBlankIcon,
    title: "Schedule",
    description: "Manage upcoming sessions and keep your calendar organized.",
  },
] as const

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "coach")

  return null
}

export default function CoachDashboard() {
  const { user } = useOutletContext<{ user: SessionUser }>()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {user.firstName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your coaching dashboard is ready. More tools will appear here soon.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coachSections.map((section) => (
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
