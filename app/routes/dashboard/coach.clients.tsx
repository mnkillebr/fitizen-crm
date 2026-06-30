import { CopyIcon, LinkIcon } from "@phosphor-icons/react"
import { Form, useActionData, useLoaderData } from "react-router"
import { useState } from "react"
import { z } from "zod"

import type { Route } from "./+types/coach.clients"
import { ClientsTable } from "~/components/clients-table"
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
import { requireApprovedCoach } from "~/lib/auth.server"
import { getCoachClientRows } from "../../../models/client.server"
import { createInvite } from "../../../models/invite.server"

const memberInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(z.email("Enter a valid email address").optional()),
  expiryDays: z.coerce.number().int().min(1).max(90).default(14),
})

function getAppUrl() {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/$/, "")
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const clients = await getCoachClientRows(user.id)

  return { clients }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const formData = await request.formData()
  const intent = formData.get("intent")

  if (intent !== "create-member-invite") {
    return null
  }

  const parsed = memberInviteSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
    expiryDays: formData.get("expiryDays") ?? "14",
  })

  if (!parsed.success) {
    return {
      fieldErrors: {
        email: parsed.error.flatten().fieldErrors.email?.[0],
        expiryDays: parsed.error.flatten().fieldErrors.expiryDays?.[0],
      },
    }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiryDays)

  const inviteData = await createInvite({
    role: "member",
    createdById: user.id,
    coachId: user.id,
    email: parsed.data.email ?? null,
    expiresAt,
  })

  const invite = inviteData[0]

  return {
    createdInvite: {
      inviteUrl: `${getAppUrl()}/invite/${invite.token}`,
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
    },
  }
}

export default function CoachClients() {
  const { clients } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  async function copyInviteUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedToken(url)
    window.setTimeout(() => setCopiedToken(null), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
        <p className="mt-2 text-muted-foreground">
          Invite new members and manage your active roster.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LinkIcon className="size-5 text-primary" />
            Invite a client
          </CardTitle>
          <CardDescription>
            Generate a single-use invite link for a new member. Optionally lock
            the invite to a specific email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="create-member-invite" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="member@example.com"
                  aria-invalid={actionData?.fieldErrors?.email ? true : undefined}
                />
                {actionData?.fieldErrors?.email ? (
                  <p className="text-xs text-destructive">
                    {actionData.fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDays">Expires in (days)</Label>
                <Input
                  id="expiryDays"
                  name="expiryDays"
                  type="number"
                  min={1}
                  max={90}
                  defaultValue={14}
                  aria-invalid={
                    actionData?.fieldErrors?.expiryDays ? true : undefined
                  }
                />
                {actionData?.fieldErrors?.expiryDays ? (
                  <p className="text-xs text-destructive">
                    {actionData.fieldErrors.expiryDays}
                  </p>
                ) : null}
              </div>
            </div>

            <Button type="submit">Generate invite link</Button>
          </Form>

          {actionData?.createdInvite ? (
            <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium">Invite link created</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {actionData.createdInvite.inviteUrl}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => copyInviteUrl(actionData.createdInvite!.inviteUrl)}
              >
                <CopyIcon />
                {copiedToken === actionData.createdInvite.inviteUrl
                  ? "Copied"
                  : "Copy link"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Roster</CardTitle>
              <CardDescription>
                Active clients and pending invites on your roster.
              </CardDescription>
            </div>
            <Badge variant="secondary">{clients.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ClientsTable clients={clients} />
        </CardContent>
      </Card>
    </div>
  )
}
