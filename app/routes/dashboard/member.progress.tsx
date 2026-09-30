import { ArrowLeftIcon, ChartLineUpIcon, PlusIcon } from "@phosphor-icons/react"
import {
  Link,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router"

import type { Route } from "./+types/member.progress"
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
  deleteInBodyScan,
  getInBodyScansForMember,
} from "../../../models/inbody.server"

type ActionData =
  | {
      formError?: string
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

  return null
}

export default function MemberProgress() {
  const { scans } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

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
          <Button asChild>
            <Link to="/dashboard/member/progress/inbody/new">
              <PlusIcon />
              Log scan
            </Link>
          </Button>
        </div>
      </div>

      {actionData?.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionData.formError}
        </div>
      ) : null}

      <InBodyTrends scans={scans} />

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
            getEditPath={(scanId) =>
              `/dashboard/member/progress/inbody/${scanId}/edit`
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
