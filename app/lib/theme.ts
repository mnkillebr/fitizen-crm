export type Theme = "auto" | "light" | "dark"

export const THEME_STORAGE_KEY = "theme"

const THEME_ORDER: Theme[] = ["auto", "light", "dark"]

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "auto"

  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored
  }

  return "auto"
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light") return "light"
  if (theme === "dark") return "dark"

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function setStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return

  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return

  document.documentElement.classList.toggle(
    "dark",
    resolveTheme(theme) === "dark"
  )
}

export function cycleTheme(theme: Theme): Theme {
  const index = THEME_ORDER.indexOf(theme)
  return THEME_ORDER[(index + 1) % THEME_ORDER.length]
}

export const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("${THEME_STORAGE_KEY}") || "auto";
    var isDark =
      theme === "dark" ||
      (theme === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`.trim()
