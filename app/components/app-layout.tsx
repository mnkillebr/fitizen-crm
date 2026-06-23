import { DarkModeToggle } from "~/components/dark-mode-toggle"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-end p-3 sm:p-4">
        <div className="pointer-events-auto">
          <DarkModeToggle />
        </div>
      </div>
      {children}
    </div>
  )
}
