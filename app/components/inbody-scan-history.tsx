import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { Form } from "react-router"

import { InBodyScanForm } from "~/components/inbody-scan-form"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import type { InBodyFormFieldErrors } from "~/lib/inbody-form"
import type { InBodyScanSelect } from "../../models/inbody.server"

type InBodyScanHistoryProps = {
  scans: InBodyScanSelect[]
  editingScanId?: string | null
  fieldErrors?: InBodyFormFieldErrors
  isSubmitting?: boolean
}

function formatMetric(value: number, digits = 1) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function InBodyScanHistory({
  scans,
  editingScanId,
  fieldErrors,
  isSubmitting = false,
}: InBodyScanHistoryProps) {
  if (scans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No InBody scans yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Logged scans will appear here for tracking over time.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>SMM</TableHead>
            <TableHead>PBF</TableHead>
            <TableHead>ECW</TableHead>
            <TableHead>BMR</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan) => (
            <TableRow key={scan.id}>
              <TableCell className="font-medium">
                {new Date(scan.scannedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>{formatMetric(scan.weightLbs)} lbs</TableCell>
              <TableCell>{formatMetric(scan.skeletalMuscleMassLbs)} lbs</TableCell>
              <TableCell>{formatMetric(scan.percentBodyFat)}%</TableCell>
              <TableCell>
                {scan.ecwRatio.toLocaleString(undefined, {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}
              </TableCell>
              <TableCell>
                {formatMetric(scan.basalMetabolicRate, 0)} kcal
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Form method="post">
                    <input type="hidden" name="intent" value="edit-scan" />
                    <input type="hidden" name="scanId" value={scan.id} />
                    <Button type="submit" variant="outline" size="sm">
                      <PencilSimpleIcon />
                      Edit
                    </Button>
                  </Form>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-scan" />
                    <input type="hidden" name="scanId" value={scan.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        if (
                          !window.confirm(
                            "Delete this InBody scan? This cannot be undone."
                          )
                        ) {
                          event.preventDefault()
                        }
                      }}
                    >
                      <TrashIcon />
                      Delete
                    </Button>
                  </Form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingScanId
        ? (() => {
            const editingScan = scans.find((scan) => scan.id === editingScanId)
            if (!editingScan) {
              return null
            }

            return (
              <div className="rounded-lg border bg-muted/10 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Edit scan</p>
                    <p className="text-sm text-muted-foreground">
                      Update values from{" "}
                      {new Date(editingScan.scannedAt).toLocaleDateString()}.
                    </p>
                  </div>
                  <Badge variant="secondary">Editing</Badge>
                </div>
                <Form method="post">
                  <input type="hidden" name="scanId" value={editingScan.id} />
                  <InBodyScanForm
                    defaultValues={editingScan}
                    fieldErrors={fieldErrors}
                    submitLabel="Save changes"
                    submitIntent="update-scan"
                    isSubmitting={isSubmitting}
                    cancelSlot={
                      <Button
                        type="submit"
                        name="intent"
                        value="cancel-edit"
                        variant="outline"
                        disabled={isSubmitting}
                        formNoValidate
                      >
                        Cancel
                      </Button>
                    }
                  />
                </Form>
              </div>
            )
          })()
        : null}
    </div>
  )
}
