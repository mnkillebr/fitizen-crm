import { Monitor, Moon, Sun } from "@phosphor-icons/react"

import { Button } from "~/components/ui/button"
import { useTheme } from "~/hooks/use-theme"
import { type Theme } from "~/lib/theme"
import { cn } from "~/lib/utils"

const themeConfig: Record<
  Theme,
  { label: string; Icon: typeof Sun }
> = {
  auto: {
    label: "System theme",
    Icon: Monitor,
  },
  light: {
    label: "Light theme",
    Icon: Sun,
  },
  dark: {
    label: "Dark theme",
    Icon: Moon,
  },
}

export function DarkModeToggle({ className }: { className?: string }) {
  const { theme, cycle } = useTheme()
  const { label, Icon } = themeConfig[theme]

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "size-9 rounded-full shadow-sm sm:size-10",
        className
      )}
      onClick={cycle}
      aria-label={`${label}. Press to change theme.`}
      title={label}
    >
      <Icon className="size-4 sm:size-4.5" aria-hidden />
    </Button>
  )
}
