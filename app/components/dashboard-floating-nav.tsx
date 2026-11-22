import { NavLink, useLocation } from "react-router"

import type { DashboardNavItem } from "~/lib/dashboard-nav"
import { cn } from "~/lib/utils"

export function DashboardFloatingNav({ items }: { items: DashboardNavItem[] }) {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Dashboard navigation"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-2xl border border-border/60 bg-background/90 px-2 py-2 shadow-lg backdrop-blur-md">
        {items.map((item) => {
          const active = item.isActive(pathname)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.endsWith("/member") || item.to.endsWith("/clients")}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("size-5", active && "text-primary")}
                weight={active ? "fill" : "regular"}
              />
              <span className="truncate">{item.title}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
