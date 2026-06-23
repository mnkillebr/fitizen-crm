import { useCallback, useSyncExternalStore } from "react"

import {
  applyTheme,
  cycleTheme,
  getStoredTheme,
  setStoredTheme,
  type Theme,
} from "~/lib/theme"

let listeners: Array<() => void> = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener]

  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const onSystemThemeChange = () => {
    if (getStoredTheme() === "auto") {
      applyTheme("auto")
      emitChange()
    }
  }

  media.addEventListener("change", onSystemThemeChange)

  return () => {
    listeners = listeners.filter((current) => current !== listener)
    media.removeEventListener("change", onSystemThemeChange)
  }
}

function getSnapshot(): Theme {
  return getStoredTheme()
}

function getServerSnapshot(): Theme {
  return "auto"
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const setTheme = useCallback((nextTheme: Theme) => {
    setStoredTheme(nextTheme)
    applyTheme(nextTheme)
    emitChange()
  }, [])

  const cycle = useCallback(() => {
    setTheme(cycleTheme(getStoredTheme()))
  }, [setTheme])

  return { theme, setTheme, cycle }
}
