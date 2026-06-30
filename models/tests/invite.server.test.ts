import { describe, expect, it } from "vitest"

import type { Invite } from "../../db/schema"
import { validateInvite } from "../invite.server"

type InviteRow = typeof Invite.$inferSelect

function makeInvite(overrides: Partial<InviteRow> = {}): InviteRow {
  const now = new Date()

  return {
    id: "11111111-1111-1111-1111-111111111111",
    token: "test-token",
    role: "member" as const,
    email: null,
    createdById: "22222222-2222-2222-2222-222222222222",
    coachId: "22222222-2222-2222-2222-222222222222",
    expiresAt: new Date(now.getTime() + 60_000),
    usedAt: null,
    usedByUserId: null,
    createdAt: now,
    ...overrides,
  }
}

describe("validateInvite", () => {
  it("accepts a valid unused invite", () => {
    const invite = makeInvite()
    const result = validateInvite(invite)

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.invite.id).toBe(invite.id)
    }
  })

  it("rejects missing invites", () => {
    expect(validateInvite(undefined)).toEqual({
      valid: false,
      outcome: "invalid_invite",
    })
  })

  it("rejects used invites", () => {
    const result = validateInvite(
      makeInvite({ usedAt: new Date(), usedByUserId: "33333333-3333-3333-3333-333333333333" })
    )

    expect(result).toEqual({ valid: false, outcome: "invite_used" })
  })

  it("rejects expired invites", () => {
    const result = validateInvite(
      makeInvite({ expiresAt: new Date(Date.now() - 60_000) })
    )

    expect(result).toEqual({ valid: false, outcome: "invite_expired" })
  })

  it("rejects email mismatches when invite is email locked", () => {
    const result = validateInvite(makeInvite({ email: "member@example.com" }), {
      email: "other@example.com",
    })

    expect(result).toEqual({ valid: false, outcome: "email_mismatch" })
  })

  it("accepts matching email for email locked invites", () => {
    const result = validateInvite(makeInvite({ email: "member@example.com" }), {
      email: "member@example.com",
    })

    expect(result.valid).toBe(true)
  })
})
