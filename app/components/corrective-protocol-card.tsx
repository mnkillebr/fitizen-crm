import { CaretDownIcon } from "@phosphor-icons/react"

import { WorkoutPreview } from "~/components/workout-preview"
import { Badge } from "~/components/ui/badge"
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
}

export function CorrectiveProtocolCard({
  protocol,
  description,
  defaultOpen = false,
}: CorrectiveProtocolCardProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <Card>
        <CollapsibleTrigger className="w-full text-left outline-none">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <CaretDownIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
                  <div className="min-w-0">
                    <CardTitle className="text-lg">
                      {protocol.title ?? "Corrective protocol"}
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {workoutStyleLabels[protocol.style]}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <WorkoutPreview workout={protocol} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
