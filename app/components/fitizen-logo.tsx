import { cn } from "~/lib/utils"

type FitizenLogoProps = {
  className?: string
  showWordmark?: boolean
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: { icon: "size-7", text: "text-base" },
  md: { icon: "size-9", text: "text-xl" },
  lg: { icon: "size-11", text: "text-2xl" },
}

export function FitizenLogo({
  className,
  showWordmark = true,
  size = "md",
}: FitizenLogoProps) {
  const { icon, text } = sizeMap[size]

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
          icon
        )}
        aria-hidden
      >
        <svg width="481" height="480" viewBox="0 0 481 480" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M124.5 365.5C70.5 332 35.8786 226.216 94.422 145.638C151.231 67.4462 260.671 44.6129 338.862 101.422C417.054 158.232 437.5 252.5 387 332C336.5 411.5 259 408.5 218 408.5"
            stroke="#fff"
            strokeWidth="18"
          />
          <path
            d="M155 302V387L193.5 434.5V342.5M193.5 245V189.5H343.5L304.5 151.5H155V274H249L292 312H184"
            stroke="#fff"
            strokeWidth="18"
          />
        </svg>
      </div>
      {showWordmark && (
        <span className={cn("font-heading font-semibold tracking-tight", text)}>
          fitizen
        </span>
      )}
    </div>
  )
}
