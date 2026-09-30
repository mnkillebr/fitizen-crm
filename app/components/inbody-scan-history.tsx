import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { Form, Link } from "react-router"

import { Button } from "~/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import type { InBodyScanSelect } from "../../models/inbody.server"

type InBodyScanHistoryProps = {
  scans: InBodyScanSelect[]
  getEditPath: (scanId: string) => string
}

function formatMetric(value: number, digits = 1) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function InBodyScanHistory({
  scans,
  getEditPath,
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
                <Button variant="outline" size="sm" asChild>
                  <Link to={getEditPath(scan.id)}>
                    <PencilSimpleIcon />
                    Edit
                  </Link>
                </Button>
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
  )
}
