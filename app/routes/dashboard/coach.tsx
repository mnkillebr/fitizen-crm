import {
  BarbellIcon,
  CalendarBlankIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { Link, useOutletContext } from "react-router"

import type { Route } from "./+types/coach"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireApprovedCoach, type SessionUser } from "~/lib/auth.server"

const coachSections = [
  {
    icon: UsersIcon,
    title: "Clients",
    description: "Review your roster, goals, and contact details in one place.",
    to: "/dashboard/coach/clients",
    linkLabel: "View clients",
  },
  {
    icon: BarbellIcon,
    title: "Exercises",
    description: "Create movements for your workout prescriptions and programs.",
    to: "/dashboard/exercises",
    linkLabel: "View exercises",
  },
  {
    icon: CalendarBlankIcon,
    title: "Workouts",
    description: "Build reusable workout templates and assign them to clients.",
    to: "/dashboard/workouts",
    linkLabel: "View workouts",
  },
] as const

export async function loader({ request }: Route.LoaderArgs) {
  await requireApprovedCoach(request)

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
          <Link key={section.title} to={section.to} className="block rounded-lg">
            <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
              <CardHeader>
                <section.icon className="size-5 text-primary" />
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium text-primary">{section.linkLabel}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
