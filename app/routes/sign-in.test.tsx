import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { TestApp } from "~/test/test-app"

function expectHomePage() {
  expect(screen.getByText("Built for personal trainers")).toBeInTheDocument()
}

describe("SignIn", () => {
  it("returns to home when clicking Back to home", async () => {
    const user = userEvent.setup()

    render(<TestApp initialEntry="/sign-in?role=coach" />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "Back to home" }))

    expectHomePage()
  })

  it("returns to home when clicking the logo", async () => {
    const user = userEvent.setup()

    render(<TestApp initialEntry="/sign-in?role=member" />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "Back to Fitizen home" }))

    expectHomePage()
  })

  it("shows helper text when submitting without an email", async () => {
    const user = userEvent.setup()

    render(<TestApp initialEntry="/sign-in?role=coach" />)

    await user.click(screen.getByRole("button", { name: "Continue with email" }))

    expect(screen.getByText("Email is required")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
  })
})
