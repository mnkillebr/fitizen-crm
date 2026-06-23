import { useState } from "react"
import { Link, useSearchParams } from "react-router"

import type { Route } from "./+types/sign-in"
import { FitizenLogo } from "~/components/fitizen-logo"
import { GoogleLogo } from "~/components/google-logo"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import {
  emailSignInSchema,
  parseSignInRole,
  signInRoleLabels,
  type SignInRole,
} from "~/lib/sign-in"
import { cn } from "~/lib/utils"

export function meta({ location }: Route.MetaArgs) {
  const role = parseSignInRole(new URLSearchParams(location.search).get("role"))
  const label = signInRoleLabels[role].toLowerCase()

  return [
    { title: `${signInRoleLabels[role]} sign in | Fitizen` },
    {
      name: "description",
      content: `Sign in to Fitizen as a ${label} using email or Google.`,
    },
  ]
}

const roleDescriptions: Record<SignInRole, string> = {
  coach: "Access your coaching dashboard, clients, and programs.",
  member: "View workouts, track progress, and stay connected with your coach.",
}

export default function SignIn() {
  const [searchParams] = useSearchParams()
  const role = parseSignInRole(searchParams.get("role"))

  const [email, setEmail] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)

  function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = emailSignInSchema.safeParse({ email, role })

    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Invalid email")
      return
    }

    setFieldError(null)
    // Auth action will be wired up in a later task.
  }

  function handleGoogleSignIn() {
    // Auth action will be wired up in a later task.
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/" aria-label="Back to Fitizen home">
            <FitizenLogo />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <Badge variant="secondary" className="mx-auto w-fit">
              {signInRoleLabels[role]} portal
            </Badge>
            <CardTitle className="mt-3 text-2xl">
              {signInRoleLabels[role]} sign in
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {roleDescriptions[role]}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
              {(["coach", "member"] as const).map((option) => (
                <Link
                  key={option}
                  to={`/sign-in?role=${option}`}
                  className={cn(
                    "rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
                    role === option
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={role === option ? "page" : undefined}
                >
                  {signInRoleLabels[option]}
                </Link>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleEmailSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (fieldError) setFieldError(null)
                  }}
                  aria-invalid={fieldError ? true : undefined}
                  aria-describedby={fieldError ? "email-error" : undefined}
                />
                {fieldError ? (
                  <p id="email-error" className="text-xs text-destructive">
                    {fieldError}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" size="lg">
                Continue with email
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleSignIn}
            >
              <GoogleLogo />
              Continue with Google
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="text-foreground underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
