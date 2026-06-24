import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  createGoogleOAuthState,
  getGoogleAuthorizationUrl,
  verifyGoogleOAuthState,
} from "~/lib/google-oauth.server"

describe("google-oauth.server", () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID =
      "821566270189-test.apps.googleusercontent.com"
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret"
    process.env.APP_URL = "http://localhost:5173"
  })

  afterEach(() => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET
    delete process.env.APP_URL
  })

  it("creates a Google authorization URL with the signed state", () => {
    const state = createGoogleOAuthState("coach")
    const url = new URL(getGoogleAuthorizationUrl(state))

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    )
    expect(url.searchParams.get("client_id")).toBe(process.env.GOOGLE_OAUTH_CLIENT_ID)
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:5173/auth/google/callback"
    )
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("scope")).toBe("openid email profile")
    expect(url.searchParams.get("state")).toBe(state)
  })

  it("round-trips OAuth state for a sign-in role", () => {
    const state = createGoogleOAuthState("member")

    expect(verifyGoogleOAuthState(state)).toBe("member")
  })

  it("rejects tampered OAuth state", () => {
    const state = createGoogleOAuthState("coach")
    const tamperedState = `${state.slice(0, -1)}x`

    expect(verifyGoogleOAuthState(tamperedState)).toBeNull()
  })
})
