import {
  ArrowRightIcon,
  BarbellIcon,
  CalendarBlankIcon,
  ChartLineUpIcon,
  ChatCircleIcon,
  ClipboardTextIcon,
  SignInIcon,
  UsersIcon,
} from "@phosphor-icons/react"
import { Link } from "react-router"

import { FitizenLogo } from "~/components/fitizen-logo"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"

const features = [
  {
    icon: UsersIcon,
    title: "Client profiles",
    description:
      "Keep goals, health notes, and contact details organized for every client you train.",
  },
  {
    icon: BarbellIcon,
    title: "Workout programming",
    description:
      "Build custom training plans, assign sessions, and update programs as clients progress.",
  },
  {
    icon: ChartLineUpIcon,
    title: "Progress tracking",
    description:
      "Log measurements, personal records, and milestones so progress stays visible over time.",
  },
  {
    icon: CalendarBlankIcon,
    title: "Session scheduling",
    description:
      "Manage your calendar, reduce no-shows, and keep sessions running on time.",
  },
  {
    icon: ChatCircleIcon,
    title: "Client messaging",
    description:
      "Stay connected between sessions with quick check-ins, reminders, and encouragement.",
  },
  {
    icon: ClipboardTextIcon,
    title: "Session notes",
    description:
      "Capture what happened in each workout so your coaching stays consistent and informed.",
  },
] as const

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <FitizenLogo />
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            <a
              href="#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#sign-in"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </a>
          </nav>
          <div className="flex items-center gap-2 pr-10 sm:pr-12">
            <Button variant="ghost" size="sm" asChild>
              <a href="#sign-in">Sign in</a>
            </Button>
            <Button size="sm" asChild>
              <a href="#sign-in">Get started</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--primary)/0.18,transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"
          />

          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <Badge variant="secondary" className="mb-6">
                Built for personal trainers
              </Badge>
              <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Coach smarter.{" "}
                <span className="text-primary">Train better.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Fitizen is the CRM for personal trainers who want less admin and
                more impact — helping you manage clients, programs, and progress
                in one focused workspace.
              </p>
              <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button size="lg" className="h-10 px-5 text-sm" asChild>
                  <Link to="/sign-in?role=coach">
                    Coach sign in
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-10 px-5 text-sm"
                  asChild
                >
                  <Link to="/sign-in?role=member">
                    Member sign in
                    <SignInIcon data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">
                Features
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything you need to run your coaching business
              </h2>
              <p className="mt-4 text-muted-foreground">
                From first consultation to long-term results, Fitizen keeps your
                workflow simple so you can focus on what matters — your clients.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="bg-card/80">
                  <CardHeader>
                    <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="size-4.5" weight="duotone" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="sign-in" className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Choose your portal
              </h2>
              <p className="mt-4 text-muted-foreground">
                Coaches manage clients and programs. Members view workouts,
                track progress, and stay connected with their trainer.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
              <Card className="relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-primary/10 to-transparent"
                />
                <CardHeader className="relative">
                  <Badge className="w-fit">Coaches</Badge>
                  <CardTitle className="mt-3 text-xl">
                    Coach sign in
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Access your client roster, build programs, schedule sessions,
                    and review progress from your coaching dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="lg" asChild>
                    <Link to="/sign-in?role=coach">
                      Sign in as coach
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-secondary to-transparent"
                />
                <CardHeader className="relative">
                  <Badge variant="secondary" className="w-fit">
                    Members
                  </Badge>
                  <CardTitle className="mt-3 text-xl">
                    Member sign in
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    View assigned workouts, log session results, and message your
                    coach — all in one place.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    size="lg"
                    variant="outline"
                    asChild
                  >
                    <Link to="/sign-in?role=member">
                      Sign in as member
                      <SignInIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <FitizenLogo
                size="lg"
                className="[&_span]:text-primary-foreground"
              />
              <p className="mt-6 text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
                Our mission is to give personal trainers a calm, capable home
                for their business — so every client gets the attention they
                deserve.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-10 px-5 text-sm"
                  asChild
                >
                  <a href="#sign-in">Start coaching with Fitizen</a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-10 border-primary-foreground/25 bg-transparent px-5 text-sm text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  asChild
                >
                  <a href="#features">Explore features</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <FitizenLogo size="sm" />
          <p>&copy; {new Date().getFullYear()} Fitizen. All rights reserved.</p>
        </div>
        <Separator />
      </footer>
    </div>
  )
}
