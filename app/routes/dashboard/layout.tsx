import { Link, Outlet, useLoaderData } from "react-router"

import type { Route } from "./+types/layout"
import { DashboardFloatingNav } from "~/components/dashboard-floating-nav"
import { DashboardSidebar } from "~/components/dashboard-sidebar"
import { DashboardUserControls } from "~/components/dashboard-user-controls"
import { FitizenLogo } from "~/components/fitizen-logo"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { requireUser, type SessionUser } from "~/lib/auth.server"
import {
  getDashboardHomePath,
  getDashboardNavItems,
} from "~/lib/dashboard-nav"

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request)

  return { user }
}

export default function DashboardLayout() {
  const { user } = useLoaderData<typeof loader>()
  const navItems = getDashboardNavItems(user.role)
  const homePath = getDashboardHomePath(user.role)

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} items={navItems} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1 hidden sm:inline-flex" />
            <Link
              to={homePath}
              aria-label="Fitizen dashboard home"
              className="sm:hidden"
            >
              <FitizenLogo size="sm" />
            </Link>
          </div>

          <DashboardUserControls
            user={user}
            compact
            className="min-w-0 sm:hidden"
          />
        </header>

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:pb-8">
          <Outlet context={{ user } satisfies { user: SessionUser }} />
        </div>
      </SidebarInset>

      <DashboardFloatingNav items={navItems} />
    </SidebarProvider>
  )
}
