import { useState, useRef } from "react"
import {
  ArrowLeftIcon,
  TargetIcon,
  UserCircleIcon,
  CameraIcon,
} from "@phosphor-icons/react"
import {
  Form,
  Link,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "react-router"
import {
  MaxFileSizeExceededError,
  parseFormData,
} from "@remix-run/form-data-parser"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Textarea } from "~/components/ui/textarea"
import { requireRole } from "~/lib/auth.server"
import {
  createCloudinaryUploadHandler,
  getMaxUploadBytes,
  type CloudinaryUploadResult,
} from "~/lib/cloudinary.server"
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
  | {
      intent: "upload-avatar"
      ok: true
      avatar: CloudinaryUploadResult
    }
  | {
      intent: "upload-avatar"
      ok: false
      formError: string
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
  const contentType = request.headers.get("Content-Type") ?? ""

  // Multipart bodies must be read once via parseFormData — do not call request.formData() first.
  if (contentType.includes("multipart/form-data")) {
    let uploaded: CloudinaryUploadResult | null = null

    try {
      const formData = await parseFormData(
        request,
        {
          maxFiles: 1,
          maxFileSize: getMaxUploadBytes("member_avatar"),
        },
        createCloudinaryUploadHandler({
          userId: user.id,
          kind: "member_avatar",
          fieldName: "avatar",
          onUploaded: (result) => {
            uploaded = result
          },
        })
      )

      const intent = formData.get("intent")?.toString()
      if (intent !== "upload-avatar") {
        return {
          intent: "upload-avatar" as const,
          ok: false as const,
          formError: "Unknown upload action.",
        } satisfies ActionData
      }

      if (!uploaded) {
        return {
          intent: "upload-avatar" as const,
          ok: false as const,
          formError: "Choose an image file to upload.",
        } satisfies ActionData
      }

      return {
        intent: "upload-avatar" as const,
        ok: true as const,
        avatar: uploaded,
      } satisfies ActionData
    } catch (error) {
      const formError =
        error instanceof MaxFileSizeExceededError
          ? "Avatar must be 5MB or smaller."
          : error instanceof Error
            ? error.message
            : "Unable to upload avatar."

      return {
        intent: "upload-avatar" as const,
        ok: false as const,
        formError,
      } satisfies ActionData
    }
  }

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarFetcher = useFetcher<ActionData>()
  const isSubmittingGoals =
    navigation.state === "submitting" && submittingIntent === "goals"
  const isSubmittingDetails =
    navigation.state === "submitting" && submittingIntent === "details"
  const isUploadingAvatar = avatarFetcher.state !== "idle"
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [goals, setGoals] = useState<string[]>(
    data.goals.length > 0 ? data.goals : [""]
  )
  const [firstName, setFirstName] = useState(data.firstName)
  const [lastName, setLastName] = useState(data.lastName)
  const [sex, setSex] = useState<SexValue | undefined>(data.sex)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleImageUpload = () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append("intent", "upload-avatar")
    formData.append("avatar", selectedFile)
    avatarFetcher.submit(formData, {
      method: "post",
      encType: "multipart/form-data",
    })
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
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
  const avatarAction =
    avatarFetcher.data?.intent === "upload-avatar" ? avatarFetcher.data : undefined
  const uploadedAvatar =
    avatarAction?.ok === true ? avatarAction.avatar : undefined
  const avatarSaved = uploadedAvatar != null
  const avatarFormError =
    avatarAction && !avatarAction.ok ? avatarAction.formError : undefined

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

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="flex flex-col gap-y-4">
          <div className="text-muted-foreground">Make changes to your profile here.</div>
          <Card>
            <CardHeader>
              <CameraIcon className="size-5 text-primary" />
              <CardTitle className="text-lg">Profile photo</CardTitle>
              <CardDescription>
                Upload an image to Cloudinary to validate signed server uploads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {avatarSaved && uploadedAvatar ? (
                <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-3 text-sm">
                  <p className="text-primary">Avatar uploaded.</p>
                  <div className="flex flex-wrap items-start gap-4">
                    <img
                      src={uploadedAvatar.thumbnailUrl ?? uploadedAvatar.secureUrl}
                      alt="Uploaded avatar"
                      className="size-24 rounded-full object-cover"
                    />
                    <div className="min-w-0 space-y-1 break-all text-xs text-muted-foreground">
                      <p>public_id: {uploadedAvatar.publicId}</p>
                      <p>
                        <a
                          href={uploadedAvatar.secureUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {uploadedAvatar.secureUrl}
                        </a>
                      </p>
                      <p>
                        {uploadedAvatar.width}×{uploadedAvatar.height} ·{" "}
                        {uploadedAvatar.format} · {uploadedAvatar.bytes} bytes
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {avatarFormError ? (
                <p className="text-sm text-destructive">{avatarFormError}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {(previewUrl || uploadedAvatar) && (
                  <img
                    src={
                      previewUrl ??
                      uploadedAvatar?.thumbnailUrl ??
                      uploadedAvatar?.secureUrl
                    }
                    alt="Avatar preview"
                    className="size-20 rounded-full object-cover"
                  />
                )}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="avatar"
                    className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                  >
                    <CameraIcon className="size-4" />
                    {selectedFile ? "Change profile photo" : "Choose profile photo"}
                  </Label>
                  <Input
                    ref={fileInputRef}
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isUploadingAvatar}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    disabled={isUploadingAvatar}
                    className="w-fit"
                  >
                    Browse…
                  </Button>
                  {selectedFile ? (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedFile.name} (
                      {Math.round(selectedFile.size / 1024)} KB)
                    </p>
                  ) : null}
                  {selectedFile ? (
                    <Button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={isUploadingAvatar}
                      className="w-fit"
                    >
                      {isUploadingAvatar ? "Uploading…" : "Upload image"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
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
        </TabsContent>
        <TabsContent value="goals" className="flex flex-col gap-y-4">
          <div className="text-muted-foreground">Make changes to your goals here.</div>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
