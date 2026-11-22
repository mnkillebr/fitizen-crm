import {
  BarbellIcon,
  BowlFoodIcon,
  CalendarBlankIcon,
  GearSixIcon,
  HouseIcon,
  PersonSimpleRunIcon,
  PersonSimpleTaiChiIcon,
  UsersIcon,
  type Icon,
} from "@phosphor-icons/react"

import type { SignInRole } from "~/lib/sign-in"

export type DashboardNavItem = {
  title: string
  to: string
  icon: Icon
  isActive: (pathname: string) => boolean
}

const coachNavItems: DashboardNavItem[] = [
  {
    title: "Clients",
    to: "/dashboard/coach/clients",
    icon: UsersIcon,
    isActive: (pathname) =>
      pathname.startsWith("/dashboard/coach/clients") ||
      pathname.startsWith("/dashboard/coach/client/"),
  },
  {
    title: "Exercises",
    to: "/dashboard/exercises",
    icon: BarbellIcon,
    isActive: (pathname) => pathname.startsWith("/dashboard/exercises"),
  },
  {
    title: "Workouts",
    to: "/dashboard/workouts",
    icon: CalendarBlankIcon,
    isActive: (pathname) => pathname.startsWith("/dashboard/workouts"),
  },
]

const memberNavItems: DashboardNavItem[] = [
  {
    title: "Home",
    to: "/dashboard/member",
    icon: HouseIcon,
    isActive: (pathname) => pathname === "/dashboard/member",
  },
  {
    title: "Workouts",
    to: "/dashboard/member/workouts",
    icon: BarbellIcon,
    isActive: (pathname) =>
      pathname.startsWith("/dashboard/member/workouts") ||
      pathname.startsWith("/dashboard/member/workout-log"),
  },
  {
    title: "Correctives",
    to: "/dashboard/member/correctives",
    icon: PersonSimpleTaiChiIcon,
    isActive: (pathname) => pathname.startsWith("/dashboard/member/correctives"),
  },
  {
    title: "Nutrition",
    to: "/dashboard/member/nutrition",
    icon: BowlFoodIcon,
    isActive: (pathname) => pathname.startsWith("/dashboard/member/nutrition"),
  },
  {
    title: "Body Comp",
    to: "/dashboard/member/composition",
    icon: PersonSimpleRunIcon,
    isActive: (pathname) => pathname.startsWith("/dashboard/member/composition"),
  },
  {
    title: "Settings",
    to: "/dashboard/member/profile",
    icon: GearSixIcon,
    isActive: (pathname) => pathname.startsWith("/dashboard/member/profile"),
  },
]

export function getDashboardNavItems(role: SignInRole): DashboardNavItem[] {
  return role === "coach" ? coachNavItems : memberNavItems
}

export function getDashboardHomePath(role: SignInRole): string {
  return role === "coach" ? "/dashboard/coach/clients" : "/dashboard/member"
}
