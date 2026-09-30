import { ArrowLeftIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import type { Route } from "./+types/member.composition.inbody.$scanId.edit"
import { InBodyScanForm } from "~/components/inbody-scan-form"
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
} from "~/lib/inbody-form"
import {
  getMemberInBodyScan,
  updateInBodyScan,
} from "../../../models/inbody.server"

const compositionUrl = "/dashboard/member/composition"

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireRole(request, "member")
  const scan = await getMemberInBodyScan(user.id, params.scanId)

  if (!scan) {
    throw new Response("Scan not found", { status: 404 })
  }

  return { scan }
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireRole(request, "member")
  const existing = await getMemberInBodyScan(user.id, params.scanId)

  if (!existing) {
    throw new Response("Scan not found", { status: 404 })
  }

  const formData = await request.formData()
  const parsed = parseInBodyFormData(formData)

  if (!parsed.success) {
    return {
      fieldErrors: getInBodyFormFieldErrors(parsed.error),
    }
  }

  const updated = await updateInBodyScan(user.id, params.scanId, parsed.data)
  if (!updated) {
    throw new Response("Scan not found", { status: 404 })
  }

  throw redirect(compositionUrl)
}

export default function MemberEditInBodyScan() {
  const { scan } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to={compositionUrl}>
            <ArrowLeftIcon />
            Back to body composition
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">Edit InBody scan</h1>
        <p className="mt-2 text-muted-foreground">
          Update values from {new Date(scan.scannedAt).toLocaleDateString()}.
        </p>
      </div>

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
                  <Link to={compositionUrl}>Cancel</Link>
                </Button>
              }
            />
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
