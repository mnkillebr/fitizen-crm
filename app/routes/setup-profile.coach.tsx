import { useState } from "react"
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"
import { z } from "zod"

import type { Route } from "./+types/setup-profile.coach"
import { FitizenLogo } from "~/components/fitizen-logo"
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
import {
  completeSetupSession,
  redeemInviteOrRedirect,
  requirePendingSignupForRole,
  splitGoogleName,
} from "~/lib/setup-profile.server"
import { createUserWithGoogleProfile } from "../../models/user.server"

const coachSetupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
})

export async function loader({ request }: Route.LoaderArgs) {
  const { pendingSignup } = await requirePendingSignupForRole(request, "coach")
  const { firstName, lastName } = splitGoogleName(pendingSignup.profile.name)

  return {
    email: pendingSignup.profile.email,
    firstName,
    lastName,
  }
}

export async function action({ request }: Route.ActionArgs) {
  const { pendingSignup, invite } = await requirePendingSignupForRole(
    request,
    "coach"
  )

  const formData = await request.formData()
  const parsed = coachSetupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  })

  if (!parsed.success) {
    return {
      fieldErrors: {
        firstName: parsed.error.flatten().fieldErrors.firstName?.[0],
        lastName: parsed.error.flatten().fieldErrors.lastName?.[0],
      },
    }
  }

  const now = new Date()

  const { user } = await createUserWithGoogleProfile(
    {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: pendingSignup.profile.email,
      role: "coach",
      updatedAt: now,
      approvedCoach: true,
      admin: false,
    },
    {
      profileId: pendingSignup.profile.id,
      email: pendingSignup.profile.email,
      name: pendingSignup.profile.name,
      picture: pendingSignup.profile.picture,
      verifiedEmail: pendingSignup.profile.verifiedEmail,
    }
  )

  await redeemInviteOrRedirect(invite.id, user.id)

  return completeSetupSession(request, {
    id: user.id,
    role: user.role,
  })
}

export default function SetupProfileCoach() {
  const { email, firstName, lastName } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const actionData = useActionData<typeof action>()
  const [localFirstName, setLocalFirstName] = useState(firstName)
  const [localLastName, setLocalLastName] = useState(lastName)
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <FitizenLogo />
        </div>

        <Card>
          <CardHeader className="text-center">
            <Badge variant="secondary" className="mx-auto w-fit">
              Coach setup
            </Badge>
            <CardTitle className="mt-3 text-2xl">Complete your profile</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Signed in as {email}. Confirm your name to finish creating your
              account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={localFirstName}
                  onChange={(event) => setLocalFirstName(event.target.value)}
                  aria-invalid={
                    actionData?.fieldErrors?.firstName ? true : undefined
                  }
                  required
                />
                {actionData?.fieldErrors?.firstName ? (
                  <p className="text-xs text-destructive">
                    {actionData.fieldErrors.firstName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={localLastName}
                  onChange={(event) => setLocalLastName(event.target.value)}
                  aria-invalid={
                    actionData?.fieldErrors?.lastName ? true : undefined
                  }
                  required
                />
                {actionData?.fieldErrors?.lastName ? (
                  <p className="text-xs text-destructive">
                    {actionData.fieldErrors.lastName}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
