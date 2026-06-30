import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"

process.env.AUTH_SECRET ??= "test-auth-secret"
process.env.GOOGLE_OAUTH_CLIENT_ID ??= "test-client-id"
process.env.GOOGLE_OAUTH_CLIENT_SECRET ??= "test-client-secret"

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

afterEach(() => {
  cleanup()
  window.location.hash = ""
})