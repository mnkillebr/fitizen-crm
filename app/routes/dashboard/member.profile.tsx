import { useState } from "react"
import {
  ArrowLeftIcon,
  TargetIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import type { Route } from "./+types/member.profile"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Textarea } from "~/components/ui/textarea"
import { requireRole } from "~/lib/auth.server"
import {
  flattenMemberProfileFieldErrors,
  parseMemberDetailsFormData,
  parseMemberGoalsFormData,
  SEX_VALUES,
  sexLabels,
  splitHeightInches,
  type MemberProfileFormFieldErrors,
  type SexValue,
} from "~/lib/member-profile-form"
import {
  getMemberProfileBundle,
  updateMemberGoals,
  updateMemberRegistrationDetails,
} from "../../../models/member-profile.server"

type ActionData =
  | {
      intent: "goals" | "details"
      ok: true
    }
  | {
      intent: "goals" | "details"
      ok: false
      fieldErrors?: MemberProfileFormFieldErrors
      formError?: string
    }

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const bundle = await getMemberProfileBundle(user.id)

  if (!bundle) {
    throw new Response("Profile not found", { status: 404 })
  }

  const height = bundle.profile
    ? splitHeightInches(bundle.profile.heightInches)
    : { heightFeet: undefined, heightInches: undefined }

  return {
    email: bundle.user.email,
    firstName: bundle.user.firstName,
    lastName: bundle.user.lastName,
    age: bundle.user.age ?? undefined,
    heightFeet: height.heightFeet,
    heightInches: height.heightInches,
    weightLbs: bundle.profile?.weightLbs,
    sex: bundle.profile?.sex,
    goals: bundle.goals.map((goal) => goal.statement),
    hasProfile: Boolean(bundle.profile),
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireRole(request, "member")
  const formData = await request.formData()
  const intent = formData.get("intent")?.toString()

  if (intent === "goals") {
    const parsed = parseMemberGoalsFormData(formData)

    if (!parsed.success) {
      return {
        intent: "goals" as const,
        ok: false as const,
        fieldErrors: flattenMemberProfileFieldErrors(parsed.error),
      } satisfies ActionData
    }

    await updateMemberGoals(user.id, parsed.data.goals)

    return { intent: "goals" as const, ok: true as const } satisfies ActionData
  }

  if (intent === "details") {
    const parsed = parseMemberDetailsFormData(formData)

    if (!parsed.success) {
      return {
        intent: "details" as const,
        ok: false as const,
        fieldErrors: flattenMemberProfileFieldErrors(parsed.error),
      } satisfies ActionData
    }

    const updated = await updateMemberRegistrationDetails(user.id, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      age: parsed.data.age,
      sex: parsed.data.sex,
      heightInches: parsed.data.totalHeightInches,
      weightLbs: parsed.data.weightLbs,
    })

    if (!updated) {
      return {
        intent: "details" as const,
        ok: false as const,
        formError: "Unable to save your details.",
      } satisfies ActionData
    }

    return {
      intent: "details" as const,
      ok: true as const,
    } satisfies ActionData
  }

  return {
    intent: "details" as const,
    ok: false as const,
    formError: "Unknown action.",
  } satisfies ActionData
}

export default function MemberProfile() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submittingIntent = navigation.formData?.get("intent")?.toString()
  const isSubmittingGoals =
    navigation.state === "submitting" && submittingIntent === "goals"
  const isSubmittingDetails =
    navigation.state === "submitting" && submittingIntent === "details"

  const [goals, setGoals] = useState<string[]>(
    data.goals.length > 0 ? data.goals : [""]
  )
  const [firstName, setFirstName] = useState(data.firstName)
  const [lastName, setLastName] = useState(data.lastName)
  const [sex, setSex] = useState<SexValue | undefined>(data.sex)

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

  const goalsErrors =
    actionData?.intent === "goals" && !actionData.ok
      ? actionData.fieldErrors
      : undefined
  const detailsErrors =
    actionData?.intent === "details" && !actionData.ok
      ? actionData.fieldErrors
      : undefined
  const detailsFormError =
    actionData?.intent === "details" && !actionData.ok
      ? actionData.formError
      : undefined
  const goalsSaved = actionData?.intent === "goals" && actionData.ok
  const detailsSaved = actionData?.intent === "details" && actionData.ok

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to="/dashboard/member">
            <ArrowLeftIcon />
            Back to dashboard
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
            <p className="mt-2 text-muted-foreground">
              Keep your goals and details up to date so your coach can train you
              effectively.
            </p>
          </div>
          {!data.hasProfile ? (
            <Badge variant="secondary">Complete your details</Badge>
          ) : null}
        </div>
      </div>

      {!data.hasProfile ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          We don&apos;t have registration details on file yet. Fill in the form
          below to finish your profile.
        </p>
      ) : null}

      <Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="goals" />
        <Card>
          <CardHeader>
            <TargetIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Fitness goals</CardTitle>
            <CardDescription>
              1–3 S.M.A.R.T. goals — Specific, Measurable, Achievable, Relevant,
              and Time-bound.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalsSaved ? (
              <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                Goals saved.
              </p>
            ) : null}
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
                  name="goals"
                  value={goal}
                  onChange={(event) => updateGoal(index, event.target.value)}
                  placeholder="Describe your S.M.A.R.T. goal…"
                  rows={3}
                  aria-invalid={goalsErrors?.goals ? true : undefined}
                />
              </div>
            ))}
            {goalsErrors?.goals ? (
              <p className="text-xs text-destructive">{goalsErrors.goals}</p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {goals.length < 3 ? (
                <Button type="button" variant="outline" onClick={addGoal}>
                  Add another goal
                </Button>
              ) : null}
              <Button type="submit" disabled={isSubmittingGoals}>
                {isSubmittingGoals ? "Saving..." : "Save goals"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Form>

      <Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="details" />
        <Card>
          <CardHeader>
            <UserCircleIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Registration details</CardTitle>
            <CardDescription>
              Basic info used for coaching and progress tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailsSaved ? (
              <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                Details saved.
              </p>
            ) : null}
            {detailsFormError ? (
              <p className="text-sm text-destructive">{detailsFormError}</p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={data.email} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Email comes from your Google account and can&apos;t be changed
                here.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  aria-invalid={detailsErrors?.firstName ? true : undefined}
                  required
                />
                {detailsErrors?.firstName ? (
                  <p className="text-xs text-destructive">
                    {detailsErrors.firstName}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  aria-invalid={detailsErrors?.lastName ? true : undefined}
                  required
                />
                {detailsErrors?.lastName ? (
                  <p className="text-xs text-destructive">
                    {detailsErrors.lastName}
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
                defaultValue={data.age}
                inputMode="numeric"
                aria-invalid={detailsErrors?.age ? true : undefined}
                required
              />
              {detailsErrors?.age ? (
                <p className="text-xs text-destructive">{detailsErrors.age}</p>
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
                  defaultValue={data.heightFeet}
                  inputMode="numeric"
                  aria-invalid={detailsErrors?.heightFeet ? true : undefined}
                  required
                />
                {detailsErrors?.heightFeet ? (
                  <p className="text-xs text-destructive">
                    {detailsErrors.heightFeet}
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
                  defaultValue={data.heightInches}
                  inputMode="decimal"
                  aria-invalid={detailsErrors?.heightInches ? true : undefined}
                  required
                />
                {detailsErrors?.heightInches ? (
                  <p className="text-xs text-destructive">
                    {detailsErrors.heightInches}
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
                defaultValue={data.weightLbs}
                inputMode="decimal"
                aria-invalid={detailsErrors?.weightLbs ? true : undefined}
                required
              />
              {detailsErrors?.weightLbs ? (
                <p className="text-xs text-destructive">
                  {detailsErrors.weightLbs}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">Sex</Label>
              <Select
                name="sex"
                value={sex}
                onValueChange={(value) => setSex(value as SexValue)}
                required
                aria-invalid={detailsErrors?.sex ? true : undefined}
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
              {detailsErrors?.sex ? (
                <p className="text-xs text-destructive">{detailsErrors.sex}</p>
              ) : null}
            </div>

            <Button type="submit" disabled={isSubmittingDetails}>
              {isSubmittingDetails ? "Saving..." : "Save details"}
            </Button>
          </CardContent>
        </Card>
      </Form>
    </div>
  )
}
