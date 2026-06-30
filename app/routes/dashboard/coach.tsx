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
  },
  {
    icon: BarbellIcon,
    title: "Programs",
    description: "Build and assign training plans as your clients progress.",
    to: null,
  },
  {
    icon: CalendarBlankIcon,
    title: "Schedule",
    description: "Manage upcoming sessions and keep your calendar organized.",
    to: null,
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
        {coachSections.map((section) => {
          const card = (
            <Card
              className={
                section.to
                  ? "transition-colors hover:border-primary/40 hover:bg-muted/30"
                  : undefined
              }
            >
              <CardHeader>
                <section.icon className="size-5 text-primary" />
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {section.to ? (
                  <p className="text-xs font-medium text-primary">View clients</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                )}
              </CardContent>
            </Card>
          )

          if (section.to) {
            return (
              <Link key={section.title} to={section.to} className="block rounded-lg">
                {card}
              </Link>
            )
          }

          return <div key={section.title}>{card}</div>
        })}
      </div>
    </div>
  )
}
