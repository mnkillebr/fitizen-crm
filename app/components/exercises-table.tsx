import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Form, Link } from "react-router"

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
import {
  exerciseEquipmentLabels,
  exerciseMuscleGroupLabels,
  exercisePlaneOfMotionLabels,
  exerciseSupportLabels,
} from "~/lib/exercise-form"
import type { ExerciseSelect } from "../../models/exercise.server"

const columnHelper = createColumnHelper<ExerciseSelect>()
const coreRowModel = getCoreRowModel()

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("muscleGroup", {
    header: "Muscle group",
    cell: (info) => (
      <Badge variant="secondary">
        {exerciseMuscleGroupLabels[info.getValue()]}
      </Badge>
    ),
  }),
  columnHelper.accessor("planeOfMotion", {
    header: "Plane",
    cell: (info) => (
      <Badge variant="secondary">
        {exercisePlaneOfMotionLabels[info.getValue()]}
      </Badge>
    ),
  }),
  columnHelper.accessor("support", {
    header: "Support",
    cell: (info) => exerciseSupportLabels[info.getValue()],
  }),
  columnHelper.accessor("equipment", {
    header: "Equipment",
    cell: (info) => exerciseEquipmentLabels[info.getValue()],
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (info) => {
      const exercise = info.row.original

      return (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/dashboard/exercises/${exercise.id}/edit`}>
              <PencilSimpleIcon />
              Edit
            </Link>
          </Button>
          <Form
            method="post"
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Delete "${exercise.name}"? This cannot be undone.`
              )

              if (!confirmed) {
                event.preventDefault()
              }
            }}
          >
            <input type="hidden" name="intent" value="delete-exercise" />
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <Button type="submit" variant="destructive" size="sm">
              <TrashIcon />
              Delete
            </Button>
          </Form>
        </div>
      )
    },
  }),
]

type ExercisesTableProps = {
  exercises: ExerciseSelect[]
}

export function ExercisesTable({ exercises }: ExercisesTableProps) {
  const table = useReactTable({
    data: exercises,
    columns,
    getCoreRowModel: coreRowModel,
  })

  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No exercises yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first exercise to start building workout prescriptions.
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
