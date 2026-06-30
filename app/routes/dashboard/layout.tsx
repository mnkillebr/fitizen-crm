import { SignOutIcon } from "@phosphor-icons/react"
import { Form, Link, NavLink, Outlet, useLoaderData } from "react-router"

import type { Route } from "./+types/layout"
import { FitizenLogo } from "~/components/fitizen-logo"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { requireUser, type SessionUser } from "~/lib/auth.server"
import { signInRoleLabels } from "~/lib/sign-in"
import { cn } from "~/lib/utils"
import { DarkModeToggle } from "~/components/dark-mode-toggle"

const coachNavItems = [
  { label: "Overview", to: "/dashboard/coach" },
  { label: "Clients", to: "/dashboard/coach/clients" },
] as const

const memberNavItems = [
  { label: "Overview", to: "/dashboard/member" },
] as const

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request)

  return { user }
}

export default function DashboardLayout() {
  const { user } = useLoaderData<typeof loader>()
  const navItems = user.role === "coach" ? coachNavItems : memberNavItems

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to={`/dashboard/${user.role}`} aria-label="Fitizen dashboard home">
              <FitizenLogo />
            </Link>

            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>

            <Badge variant="secondary">{signInRoleLabels[user.role]}</Badge>
            <DarkModeToggle />
            <Form method="post" action="/logout">
              <Button type="submit" variant="outline" size="sm">
                <SignOutIcon />
                Log out
              </Button>
            </Form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet context={{ user } satisfies { user: SessionUser }} />
      </main>
    </div>
  )
}
