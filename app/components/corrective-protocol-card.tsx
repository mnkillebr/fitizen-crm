import { CaretDownIcon, TrashIcon } from "@phosphor-icons/react"
import { Form } from "react-router"

import { WorkoutPreview } from "~/components/workout-preview"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { workoutStyleLabels } from "~/lib/workout-builder"
import type { WorkoutWithDetails } from "../../models/workout.server"

type CorrectiveProtocolCardProps = {
  protocol: WorkoutWithDetails
  description: string
  defaultOpen?: boolean
  canRemove?: boolean
}

export function CorrectiveProtocolCard({
  protocol,
  description,
  defaultOpen = false,
  canRemove = false,
}: CorrectiveProtocolCardProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CollapsibleTrigger className="min-w-0 flex-1 text-left outline-none">
              <div className="flex items-start gap-2">
                <CaretDownIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                <div className="min-w-0">
                  <CardTitle className="text-lg">
                    {protocol.title ?? "Corrective protocol"}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
            </CollapsibleTrigger>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {workoutStyleLabels[protocol.style]}
              </Badge>
              {canRemove ? (
                <Form
                  method="post"
                  onSubmit={(event) => {
                    const title = protocol.title ?? "this corrective protocol"
                    const confirmed = window.confirm(
                      `Remove "${title}" from this client? This cannot be undone.`
                    )

                    if (!confirmed) {
                      event.preventDefault()
                    }
                  }}
                >
                  <input type="hidden" name="intent" value="remove-corrective" />
                  <input type="hidden" name="workoutId" value={protocol.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    <TrashIcon />
                    Remove
                  </Button>
                </Form>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <WorkoutPreview workout={protocol} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
