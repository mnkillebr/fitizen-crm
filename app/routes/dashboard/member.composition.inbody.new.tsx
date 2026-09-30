import { ArrowLeftIcon, PlusIcon } from "@phosphor-icons/react"
import { Form, Link, redirect, useActionData, useNavigation } from "react-router"

import type { Route } from "./+types/member.composition.inbody.new"
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
import { createInBodyScan } from "../../../models/inbody.server"

const compositionUrl = "/dashboard/member/composition"

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "member")
  return null
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireRole(request, "member")
  const formData = await request.formData()
  const parsed = parseInBodyFormData(formData)

  if (!parsed.success) {
    return {
      fieldErrors: getInBodyFormFieldErrors(parsed.error),
    }
  }

  await createInBodyScan(user.id, user.id, parsed.data)
  throw redirect(compositionUrl)
}

export default function MemberLogInBodyScan() {
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

        <h1 className="text-3xl font-semibold tracking-tight">Log InBody scan</h1>
        <p className="mt-2 text-muted-foreground">
          Enter values from your InBody report.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlusIcon className="size-5 text-primary" />
            Scan details
          </CardTitle>
          <CardDescription>
            Record body composition metrics from this scan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <InBodyScanForm
              fieldErrors={actionData?.fieldErrors}
              submitLabel="Save scan"
              submitIntent="create-scan"
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
