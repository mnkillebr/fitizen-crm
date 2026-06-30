import { useState } from "react"
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"
import { z } from "zod"

import type { Route } from "./+types/setup-profile"
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
  getPendingSignup,
} from "~/lib/invite-session.server"
import { signInRoleLabels } from "~/lib/sign-in"
import { commitSession, getSession } from "~/lib/sessions"
import {
  redeemInvite,
  validateInviteById,
} from "../../models/invite.server"
import {
  createUserWithGoogleProfile,
  linkMemberToCoach,
} from "../../models/user.server"

const setupProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  age: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? Number(value) : undefined))
    .pipe(z.number().int().min(1).max(120).optional()),
})

function splitGoogleName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/)

  if (parts.length === 0) {
    return { firstName: "", lastName: "" }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const pendingSignup = await getPendingSignup(request)

  if (!pendingSignup) {
    throw redirect("/sign-in?error=setup_required")
  }

  const inviteResult = await validateInviteById(pendingSignup.inviteId, {
    email: pendingSignup.profile.email,
  })

  if (!inviteResult.valid) {
    throw redirect("/sign-in?error=invite_invalid")
  }

  const { firstName, lastName } = splitGoogleName(pendingSignup.profile.name)

  return {
    role: pendingSignup.role,
    email: pendingSignup.profile.email,
    firstName,
    lastName,
  }
}

export async function action({ request }: Route.ActionArgs) {
  const pendingSignup = await getPendingSignup(request)

  if (!pendingSignup) {
    return redirect("/sign-in?error=setup_required")
  }

  const formData = await request.formData()
  const parsed = setupProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    age: formData.get("age")?.toString() ?? "",
  })

  if (!parsed.success) {
    return {
      fieldErrors: {
        firstName: parsed.error.flatten().fieldErrors.firstName?.[0],
        lastName: parsed.error.flatten().fieldErrors.lastName?.[0],
        age: parsed.error.flatten().fieldErrors.age?.[0],
      },
    }
  }

  const inviteResult = await validateInviteById(pendingSignup.inviteId, {
    email: pendingSignup.profile.email,
  })

  if (!inviteResult.valid) {
    return redirect("/sign-in?error=invite_invalid")
  }

  const invite = inviteResult.invite
  const now = new Date()

  const { user } = await createUserWithGoogleProfile(
    {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      age: parsed.data.age,
      email: pendingSignup.profile.email,
      role: pendingSignup.role,
      updatedAt: now,
      approvedCoach: pendingSignup.role === "coach",
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

  if (pendingSignup.role === "member" && invite.coachId) {
    await linkMemberToCoach(invite.coachId, user.id)
  }

  const redeemed = await redeemInvite(invite.id, user.id)

  if (redeemed.length === 0) {
    return redirect("/sign-in?error=invite_invalid")
  }

  const session = await getSession(request.headers.get("cookie"))
  session.set("userId", user.id)
  session.set("role", user.role)
  session.unset("pendingSignup")
  session.unset("inviteId")
  session.unset("inviteRole")

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  })
}

export default function SetupProfile() {
  const { role, email, firstName, lastName } = useLoaderData<typeof loader>()
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
              {signInRoleLabels[role]} setup
            </Badge>
            <CardTitle className="mt-3 text-2xl">Complete your profile</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Signed in as {email}. Confirm your details to finish creating your
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
                  aria-invalid={actionData?.fieldErrors?.firstName ? true : undefined}
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
                  aria-invalid={actionData?.fieldErrors?.lastName ? true : undefined}
                  required
                />
                {actionData?.fieldErrors?.lastName ? (
                  <p className="text-xs text-destructive">
                    {actionData.fieldErrors.lastName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age (optional)</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  min={1}
                  max={120}
                  inputMode="numeric"
                  aria-invalid={actionData?.fieldErrors?.age ? true : undefined}
                />
                {actionData?.fieldErrors?.age ? (
                  <p className="text-xs text-destructive">
                    {actionData.fieldErrors.age}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
