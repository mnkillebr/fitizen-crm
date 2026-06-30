import { describe, expect, it } from "vitest"

import {
  googleSignInErrorMessages,
  parseGoogleSignInError,
} from "~/lib/sign-in"

describe("sign-in errors", () => {
  it("parses invite-related error codes", () => {
    expect(parseGoogleSignInError("invite_invalid")).toBe("invite_invalid")
    expect(parseGoogleSignInError("invite_email_mismatch")).toBe(
      "invite_email_mismatch"
    )
    expect(parseGoogleSignInError("setup_required")).toBe("setup_required")
  })

  it("includes invite messaging for account_not_found", () => {
    expect(googleSignInErrorMessages.account_not_found).toContain("invite link")
  })
})
