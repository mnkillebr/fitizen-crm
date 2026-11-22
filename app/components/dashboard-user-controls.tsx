import { SignOutIcon } from "@phosphor-icons/react"
import { Form } from "react-router"

import { DarkModeToggle } from "~/components/dark-mode-toggle"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { UserAvatar } from "~/components/user-avatar"
import type { SessionUser } from "~/lib/auth.server"
import { signInRoleLabels } from "~/lib/sign-in"
import { cn } from "~/lib/utils"

type DashboardUserControlsProps = {
  user: SessionUser
  className?: string
  /** Tighten name/email width for cramped mobile headers. */
  compact?: boolean
  /** Icon-rail layout: avatar, theme, and logout stacked in a column. */
  collapsed?: boolean
}

export function DashboardUserControls({
  user,
  className,
  compact = false,
  collapsed = false,
}: DashboardUserControlsProps) {
  const avatar = (
    <UserAvatar
      src={user.avatarUrl}
      alt={`${user.firstName} ${user.lastName}`}
      className="size-8 shrink-0"
      iconClassName="size-8"
    />
  )

  const actions = (
    <>
      <DarkModeToggle className="size-8 shadow-none" />
      <Form method="post" action="/logout">
        <Button
          type="submit"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Log out"
        >
          <SignOutIcon />
        </Button>
      </Form>
    </>
  )

  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        {avatar}
        {actions}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {avatar}
      <div className={cn("min-w-0 flex-1", compact && "max-w-28")}>
        <p className="hidden sm:block truncate text-sm font-medium leading-tight">
          {user.firstName} {user.lastName}
        </p>
        <p className="hidden sm:block truncate text-xs leading-tight text-muted-foreground">
          {user.email}
        </p>
        <Badge variant="secondary" className="mt-1">
          {signInRoleLabels[user.role]}
        </Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </div>
  )
}
