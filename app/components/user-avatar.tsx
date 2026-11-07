import { UserCircleIcon } from "@phosphor-icons/react"

import { cn } from "~/lib/utils"

type UserAvatarProps = {
  src?: string | null
  alt: string
  className?: string
  iconClassName?: string
}

export function UserAvatar({
  src,
  alt,
  className,
  iconClassName,
}: UserAvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("size-9 shrink-0 rounded-full object-cover", className)}
      />
    )
  }

  return (
    <UserCircleIcon
      className={cn("size-9 shrink-0 text-muted-foreground", iconClassName)}
      weight="duotone"
      aria-label={alt}
    />
  )
}
