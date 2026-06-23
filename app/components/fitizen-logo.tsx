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
        <svg viewBox="0 0 24 24" fill="none" className="size-[55%]">
          <path
            d="M6 8.5C6 7.12 7.12 6 8.5 6h7C16.88 6 18 7.12 18 8.5v7c0 1.38-1.12 2.5-2.5 2.5h-7C7.12 18 6 16.88 6 15.5v-7Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9 12h6M12 9v6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
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
