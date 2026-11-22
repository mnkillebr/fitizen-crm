import { Link, NavLink, useLocation } from "react-router"

import { DashboardUserControls } from "~/components/dashboard-user-controls"
import { FitizenLogo } from "~/components/fitizen-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "~/components/ui/sidebar"
import type { SessionUser } from "~/lib/auth.server"
import {
  getDashboardHomePath,
  type DashboardNavItem,
} from "~/lib/dashboard-nav"
import { signInRoleLabels } from "~/lib/sign-in"

export function DashboardSidebar({
  user,
  items,
}: {
  user: SessionUser
  items: DashboardNavItem[]
}) {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const showWordmark = isMobile || state === "expanded"
  const homePath = getDashboardHomePath(user.role)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Fitizen">
              <Link
                to={homePath}
                aria-label="Fitizen dashboard home"
                onClick={() => {
                  if (isMobile) setOpenMobile(false)
                }}
              >
                <FitizenLogo size="sm" showWordmark={showWordmark} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{signInRoleLabels[user.role]}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive(pathname)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.to}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false)
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <DashboardUserControls
          user={user}
          collapsed={!isMobile && state === "collapsed"}
          className={
            !isMobile && state === "collapsed"
              ? undefined
              : "overflow-hidden rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2"
          }
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
