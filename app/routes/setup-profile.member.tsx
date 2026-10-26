import { useEffect, useState } from "react"
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"
import { z } from "zod"

import type { Route } from "./+types/setup-profile.member"
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
import { Progress } from "~/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Textarea } from "~/components/ui/textarea"
import {
  completeSetupSession,
  redeemInviteOrRedirect,
  requirePendingSignupForRole,
  splitGoogleName,
} from "~/lib/setup-profile.server"
import { createMemberOnboarding } from "../../models/member-profile.server"

const SEX_VALUES = ["male", "female", "other", "prefer_not_to_say"] as const

const sexLabels: Record<(typeof SEX_VALUES)[number], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
}

const goalsStepSchema = z.object({
  goals: z
    .array(z.string().trim().min(1, "Goal cannot be empty").max(500))
    .min(1, "Add at least one goal")
    .max(3, "You can add up to 3 goals"),
})

const memberSetupSchema = z
  .object({
    goals: z
      .array(z.string().trim().min(1, "Goal cannot be empty").max(500))
      .min(1, "Add at least one goal")
      .max(3, "You can add up to 3 goals"),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    age: z.coerce.number().int().min(1, "Enter a valid age").max(120),
    heightFeet: z.coerce.number().int().min(3, "Enter a valid height").max(8),
    heightInches: z.coerce
      .number()
      .min(0, "Enter a valid height")
      .max(11.9, "Inches must be less than 12"),
    weightLbs: z.coerce
      .number()
      .min(50, "Enter a valid weight")
      .max(700, "Enter a valid weight"),
    sex: z.enum(SEX_VALUES, { error: "Select an option" }),
  })
  .transform((data) => ({
    ...data,
    totalHeightInches: data.heightFeet * 12 + data.heightInches,
  }))

const STEPS = ["welcome", "goals", "registration"] as const
type Step = (typeof STEPS)[number]

export async function loader({ request }: Route.LoaderArgs) {
  const { pendingSignup } = await requirePendingSignupForRole(request, "member")
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
    "member"
  )

  const formData = await request.formData()
  const goals = formData
    .getAll("goals")
    .map((value) => value.toString())
    .filter((value) => value.trim().length > 0)

  const parsed = memberSetupSchema.safeParse({
    goals,
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    age: formData.get("age"),
    heightFeet: formData.get("heightFeet"),
    heightInches: formData.get("heightInches"),
    weightLbs: formData.get("weightLbs"),
    sex: formData.get("sex"),
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return {
      fieldErrors: {
        goals: fieldErrors.goals?.[0],
        firstName: fieldErrors.firstName?.[0],
        lastName: fieldErrors.lastName?.[0],
        age: fieldErrors.age?.[0],
        heightFeet: fieldErrors.heightFeet?.[0],
        heightInches: fieldErrors.heightInches?.[0],
        weightLbs: fieldErrors.weightLbs?.[0],
        sex: fieldErrors.sex?.[0],
      },
    }
  }

  const now = new Date()
  const { user } = await createMemberOnboarding({
    user: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      age: parsed.data.age,
      email: pendingSignup.profile.email,
      role: "member",
      updatedAt: now,
      approvedCoach: false,
      admin: false,
    },
    googleProfile: {
      profileId: pendingSignup.profile.id,
      email: pendingSignup.profile.email,
      name: pendingSignup.profile.name,
      picture: pendingSignup.profile.picture,
      verifiedEmail: pendingSignup.profile.verifiedEmail,
    },
    profile: {
      sex: parsed.data.sex,
      heightInches: parsed.data.totalHeightInches,
      weightLbs: parsed.data.weightLbs,
    },
    goals: parsed.data.goals,
    coachId: invite.coachId,
  })

  await redeemInviteOrRedirect(invite.id, user.id)

  return completeSetupSession(request, {
    id: user.id,
    role: user.role,
  })
}

export default function SetupProfileMember() {
  const { email, firstName, lastName } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const actionData = useActionData<typeof action>()
  const isSubmitting = navigation.state === "submitting"

  const [step, setStep] = useState<Step>("welcome")
  const [goals, setGoals] = useState<string[]>([""])
  const [goalError, setGoalError] = useState<string | undefined>()
  const [localFirstName, setLocalFirstName] = useState(firstName)
  const [localLastName, setLocalLastName] = useState(lastName)
  const [sex, setSex] = useState<(typeof SEX_VALUES)[number] | undefined>()

  const stepIndex = STEPS.indexOf(step)
  const progressValue = ((stepIndex + 1) / STEPS.length) * 100

  useEffect(() => {
    if (actionData?.fieldErrors) {
      setStep("registration")
    }
  }, [actionData])

  function goToGoals() {
    setStep("goals")
  }

  function goToRegistration() {
    const parsed = goalsStepSchema.safeParse({
      goals: goals.map((goal) => goal.trim()).filter(Boolean),
    })

    if (!parsed.success) {
      setGoalError(parsed.error.flatten().fieldErrors.goals?.[0] ?? "Add at least one goal")
      return
    }

    setGoals(parsed.data.goals)
    setGoalError(undefined)
    setStep("registration")
  }

  function addGoal() {
    if (goals.length >= 3) return
    setGoals([...goals, ""])
  }

  function removeGoal(index: number) {
    if (goals.length <= 1) return
    setGoals(goals.filter((_, i) => i !== index))
  }

  function updateGoal(index: number, value: string) {
    setGoals(goals.map((goal, i) => (i === index ? value : goal)))
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <FitizenLogo />
        </div>

        <Card>
          <CardHeader className="space-y-4 text-center">
            <Badge variant="secondary" className="mx-auto w-fit">
              Member onboarding
            </Badge>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {STEPS.length}
              </p>
              <Progress value={progressValue} className="h-1.5" />
            </div>
          </CardHeader>

          <CardContent>
            {step === "welcome" ? (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <CardTitle className="text-2xl">Welcome to Fitizen</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Thank you for trusting us with your coaching needs. We&apos;re
                    excited to partner with you on your fitness journey. A few
                    quick questions will help your coach personalize your
                    program.
                  </CardDescription>
                  <p className="pt-2 text-xs text-muted-foreground">
                    Signed in as {email}
                  </p>
                </div>
                <Button type="button" className="w-full" size="lg" onClick={goToGoals}>
                  Continue
                </Button>
              </div>
            ) : null}

            {step === "goals" ? (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <CardTitle className="text-2xl">Your fitness goals</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Add 1–3 S.M.A.R.T. goals — Specific, Measurable, Achievable,
                    Relevant, and Time-bound. Example: &ldquo;Lose 7 lbs in 12
                    weeks by training 3× per week.&rdquo;
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  {goals.map((goal, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`goal-${index}`}>Goal {index + 1}</Label>
                        {goals.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGoal(index)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <Textarea
                        id={`goal-${index}`}
                        value={goal}
                        onChange={(event) =>
                          updateGoal(index, event.target.value)
                        }
                        placeholder="Describe your S.M.A.R.T. goal…"
                        rows={3}
                        aria-invalid={goalError ? true : undefined}
                      />
                    </div>
                  ))}
                  {(goalError || actionData?.fieldErrors?.goals) && (
                    <p className="text-xs text-destructive">
                      {goalError ?? actionData?.fieldErrors?.goals}
                    </p>
                  )}
                  {goals.length < 3 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={addGoal}
                    >
                      Add another goal
                    </Button>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("welcome")}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    size="lg"
                    onClick={goToRegistration}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "registration" ? (
              <Form method="post" className="space-y-6">
                {goals.map((goal, index) => (
                  <input
                    key={index}
                    type="hidden"
                    name="goals"
                    value={goal}
                  />
                ))}

                <div className="space-y-2 text-center">
                  <CardTitle className="text-2xl">About you</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Share a few details so your coach can tailor workouts and
                    track progress.
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={localFirstName}
                        onChange={(event) =>
                          setLocalFirstName(event.target.value)
                        }
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
                        onChange={(event) =>
                          setLocalLastName(event.target.value)
                        }
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min={1}
                      max={120}
                      inputMode="numeric"
                      aria-invalid={
                        actionData?.fieldErrors?.age ? true : undefined
                      }
                      required
                    />
                    {actionData?.fieldErrors?.age ? (
                      <p className="text-xs text-destructive">
                        {actionData.fieldErrors.age}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="heightFeet">Height (ft)</Label>
                      <Input
                        id="heightFeet"
                        name="heightFeet"
                        type="number"
                        min={3}
                        max={8}
                        inputMode="numeric"
                        aria-invalid={
                          actionData?.fieldErrors?.heightFeet ? true : undefined
                        }
                        required
                      />
                      {actionData?.fieldErrors?.heightFeet ? (
                        <p className="text-xs text-destructive">
                          {actionData.fieldErrors.heightFeet}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heightInches">Height (in)</Label>
                      <Input
                        id="heightInches"
                        name="heightInches"
                        type="number"
                        min={0}
                        max={11.9}
                        step="0.1"
                        inputMode="decimal"
                        aria-invalid={
                          actionData?.fieldErrors?.heightInches
                            ? true
                            : undefined
                        }
                        required
                      />
                      {actionData?.fieldErrors?.heightInches ? (
                        <p className="text-xs text-destructive">
                          {actionData.fieldErrors.heightInches}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weightLbs">Weight (lbs)</Label>
                    <Input
                      id="weightLbs"
                      name="weightLbs"
                      type="number"
                      min={50}
                      max={700}
                      step="0.1"
                      inputMode="decimal"
                      aria-invalid={
                        actionData?.fieldErrors?.weightLbs ? true : undefined
                      }
                      required
                    />
                    {actionData?.fieldErrors?.weightLbs ? (
                      <p className="text-xs text-destructive">
                        {actionData.fieldErrors.weightLbs}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <Select
                      name="sex"
                      value={sex}
                      onValueChange={(value) =>
                        setSex(value as (typeof SEX_VALUES)[number])
                      }
                      required
                      aria-invalid={
                        actionData?.fieldErrors?.sex ? true : undefined
                      }
                    >
                      <SelectTrigger id="sex" className="w-full">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Sex</SelectLabel>
                          {SEX_VALUES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {sexLabels[value]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {actionData?.fieldErrors?.sex ? (
                      <p className="text-xs text-destructive">
                        {actionData.fieldErrors.sex}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("goals")}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                </div>
              </Form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
