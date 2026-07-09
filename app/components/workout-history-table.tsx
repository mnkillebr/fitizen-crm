import { EyeIcon } from "@phosphor-icons/react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Link } from "react-router"

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
import { workoutStyleLabels } from "~/lib/workout-builder"
import type { CompletedLogSummary } from "../../models/workout.server"

const columnHelper = createColumnHelper<
  CompletedLogSummary & { clientId: string }
>()

type WorkoutHistoryTableProps = {
  clientId: string
  logs: CompletedLogSummary[]
}

export function WorkoutHistoryTable({ clientId, logs }: WorkoutHistoryTableProps) {
  const data = logs.map((log) => ({ ...log, clientId }))

  const columns = [
    columnHelper.accessor("title", {
      header: "Workout",
      cell: (info) => (
        <span className="font-medium">{info.getValue() ?? "Untitled workout"}</span>
      ),
    }),
    columnHelper.accessor("style", {
      header: "Style",
      cell: (info) => (
        <Badge variant="secondary">{workoutStyleLabels[info.getValue()]}</Badge>
      ),
    }),
    columnHelper.accessor("completedAt", {
      header: "Completed",
      cell: (info) => (
        <span className="text-muted-foreground">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const log = info.row.original

        return (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/dashboard/coach/client/${clientId}/workout-log/${log.logId}`}>
                <EyeIcon />
                Review
              </Link>
            </Button>
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No completed workouts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed session logs will appear here.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
