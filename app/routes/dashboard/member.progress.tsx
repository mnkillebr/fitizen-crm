import { ArrowLeftIcon, ChartLineUpIcon, PlusIcon } from "@phosphor-icons/react"
import { useState } from "react"
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import type { Route } from "./+types/member.progress"
import { InBodyScanForm } from "~/components/inbody-scan-form"
import { InBodyScanHistory } from "~/components/inbody-scan-history"
import { InBodyTrends } from "~/components/inbody-trends"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireRole } from "~/lib/auth.server"
import {
  getInBodyFormFieldErrors,
  parseInBodyFormData,
  type InBodyFormFieldErrors,
} from "~/lib/inbody-form"
import {
  createInBodyScan,
  deleteInBodyScan,
  getInBodyScansForMember,
  updateInBodyScan,
} from "../../../models/inbody.server"

type ActionData =
  | {
      fieldErrors?: InBodyFormFieldErrors
      formError?: string
      editingScanId?: string | null
    }
  | null

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const scans = await getInBodyScansForMember(user.id, "desc")

  return { scans }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireRole(request, "member")
  const formData = await request.formData()
  const intent = formData.get("intent")?.toString()

  if (intent === "edit-scan") {
    const scanId = formData.get("scanId")?.toString()
    if (!scanId) {
      return { formError: "Scan not found." } satisfies ActionData
    }
    return { editingScanId: scanId } satisfies ActionData
  }

  if (intent === "cancel-edit") {
    return { editingScanId: null } satisfies ActionData
  }

  if (intent === "delete-scan") {
    const scanId = formData.get("scanId")?.toString()
    if (!scanId) {
      return { formError: "Scan not found." } satisfies ActionData
    }

    const deleted = await deleteInBodyScan(user.id, scanId)
    if (!deleted) {
      return { formError: "Unable to delete this scan." } satisfies ActionData
    }

    throw redirect("/dashboard/member/progress")
  }

  if (intent === "create-scan" || intent === "update-scan") {
    const parsed = parseInBodyFormData(formData)
    if (!parsed.success) {
      return {
        fieldErrors: getInBodyFormFieldErrors(parsed.error),
        editingScanId:
          intent === "update-scan"
            ? formData.get("scanId")?.toString() ?? null
            : null,
      } satisfies ActionData
    }

    if (intent === "create-scan") {
      await createInBodyScan(user.id, user.id, parsed.data)
      throw redirect("/dashboard/member/progress")
    }

    const scanId = formData.get("scanId")?.toString()
    if (!scanId) {
      return { formError: "Scan not found." } satisfies ActionData
    }

    const updated = await updateInBodyScan(user.id, scanId, parsed.data)
    if (!updated) {
      return { formError: "Unable to update this scan." } satisfies ActionData
    }

    throw redirect("/dashboard/member/progress")
  }

  return null
}

export default function MemberProgress() {
  const { scans } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"
  const [showCreateForm, setShowCreateForm] = useState(scans.length === 0)

  const editingScanId = actionData?.editingScanId ?? null

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
            <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
            <p className="mt-2 text-muted-foreground">
              Log InBody scans and track body composition over time.
            </p>
          </div>
          {!showCreateForm && !editingScanId ? (
            <Button type="button" onClick={() => setShowCreateForm(true)}>
              <PlusIcon />
              Log scan
            </Button>
          ) : null}
        </div>
      </div>

      {actionData?.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.formError}
        </div>
      ) : null}

      <InBodyTrends scans={scans} />

      {showCreateForm && !editingScanId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusIcon className="size-5 text-primary" />
              Log InBody scan
            </CardTitle>
            <CardDescription>
              Enter values from your InBody report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post">
              <InBodyScanForm
                fieldErrors={
                  !editingScanId ? actionData?.fieldErrors : undefined
                }
                submitLabel="Save scan"
                submitIntent="create-scan"
                isSubmitting={isSubmitting}
                cancelSlot={
                  scans.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  ) : null
                }
              />
            </Form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ChartLineUpIcon className="size-5 text-primary" />
                Scan history
              </CardTitle>
              <CardDescription>
                Review, edit, or delete past InBody scans.
              </CardDescription>
            </div>
            <Badge variant="secondary">{scans.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <InBodyScanHistory
            scans={scans}
            editingScanId={editingScanId}
            fieldErrors={editingScanId ? actionData?.fieldErrors : undefined}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
