import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TestApp } from "~/test/test-app"

function expectHomePage() {
  expect(screen.getByText("Built for personal trainers")).toBeInTheDocument()
}

function expectSignInPage(role: "coach" | "member") {
  expect(screen.getByText(`${role === "coach" ? "Coach" : "Member"} portal`)).toBeInTheDocument()
}

describe("Home", () => {
  describe("sign-in route links", () => {
    it.each([
      { name: "Coach sign in", role: "coach" as const },
      { name: "Member sign in", role: "member" as const },
      { name: "Sign in as coach", role: "coach" as const },
      { name: "Sign in as member", role: "member" as const },
    ])("navigates to sign-in when clicking $name", async ({ name, role }) => {
      const user = userEvent.setup()

      render(<TestApp />)

      await user.click(screen.getByRole("link", { name }))

      await screen.findByText(`${role === "coach" ? "Coach" : "Member"} portal`)
      expectSignInPage(role)
    })
  })

  describe("scroll to sign-in section", () => {
    it("scrolls to the sign-in section from each header and CTA link", async () => {
      const user = userEvent.setup()

      render(<TestApp />)

      const signInSection = document.getElementById("sign-in")
      expect(signInSection).toBeInTheDocument()

      const scrollLinks = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href") === "#sign-in")

      expect(scrollLinks).toHaveLength(4)

      for (const link of scrollLinks) {
        await user.click(link)
        expect(window.location.hash).toBe("#sign-in")
      }
    })
  })
})
