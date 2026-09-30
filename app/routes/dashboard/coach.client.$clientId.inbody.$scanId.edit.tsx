import { ArrowLeftIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import type { Route } from "./+types/coach.client.$clientId.inbody.$scanId.edit"
import { InBodyScanForm } from "~/components/inbody-scan-form"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { requireApprovedCoach } from "~/lib/auth.server"
import {
  getInBodyFormFieldErrors,
  parseInBodyFormData,
  type InBodyFormFieldErrors,
} from "~/lib/inbody-form"
import { getCoachClientById } from "../../../models/client.server"
import {
  getCoachInBodyScan,
  updateCoachInBodyScan,
} from "../../../models/inbody.server"

type ActionData = {
  fieldErrors?: InBodyFormFieldErrors
  formError?: string
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const scan = await getCoachInBodyScan(user.id, params.clientId, params.scanId)
  if (!scan) {
    throw new Response("Scan not found", { status: 404 })
  }

  return { client, scan }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const client = await getCoachClientById(user.id, params.clientId)

  if (!client) {
    throw new Response("Client not found", { status: 404 })
  }

  const existing = await getCoachInBodyScan(
    user.id,
    params.clientId,
    params.scanId
  )
  if (!existing) {
    throw new Response("Scan not found", { status: 404 })
  }

  const clientUrl = `/dashboard/coach/client/${params.clientId}`
  const formData = await request.formData()
  const parsed = parseInBodyFormData(formData)

  if (!parsed.success) {
    return {
      fieldErrors: getInBodyFormFieldErrors(parsed.error),
    } satisfies ActionData
  }

  const updated = await updateCoachInBodyScan(
    user.id,
    params.clientId,
    params.scanId,
    parsed.data
  )
  if (!updated) {
    return { formError: "Unable to update this scan." } satisfies ActionData
  }

  throw redirect(clientUrl)
}

export default function CoachEditInBodyScan() {
  const { client, scan } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"
  const clientUrl = `/dashboard/coach/client/${client.id}`

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to={clientUrl}>
            <ArrowLeftIcon />
            Back to {client.name}
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">Edit InBody scan</h1>
        <p className="mt-2 text-muted-foreground">
          Update values from {client.name}&apos;s scan on{" "}
          {new Date(scan.scannedAt).toLocaleDateString()}.
        </p>
      </div>

      {actionData?.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.formError}
        </div>
      ) : null}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PencilSimpleIcon className="size-5 text-primary" />
            Scan details
          </CardTitle>
          <CardDescription>
            Update body composition metrics for this scan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <InBodyScanForm
              defaultValues={scan}
              fieldErrors={actionData?.fieldErrors}
              submitLabel="Save changes"
              submitIntent="update-scan"
              isSubmitting={isSubmitting}
              cancelSlot={
                <Button variant="outline" asChild>
                  <Link to={clientUrl}>Cancel</Link>
                </Button>
              }
            />
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
