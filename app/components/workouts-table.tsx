import { CalendarBlankIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Form, Link } from "react-router"
import { useState } from "react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { workoutStyleLabels } from "~/lib/workout-builder"
import type { CoachClientDetail } from "../../models/client.server"
import type { WorkoutTemplateSelect } from "../../models/workout-template.server"

const columnHelper = createColumnHelper<WorkoutTemplateSelect>()

type WorkoutsTableProps = {
  templates: WorkoutTemplateSelect[]
  clients: CoachClientDetail[]
}

function AssignWorkoutForm({
  template,
  clients,
}: {
  template: WorkoutTemplateSelect
  clients: CoachClientDetail[]
}) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().slice(0, 10)

  return (
    <Form method="post" className="mt-3 rounded-md border bg-muted/10 p-3">
      <input type="hidden" name="intent" value="assign-workout" />
      <input type="hidden" name="templateId" value={template.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`assign-client-${template.id}`}>Client</Label>
          <Select name="memberId" required defaultValue="">
            <SelectTrigger id={`assign-client-${template.id}`} className="w-full">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Client</SelectLabel>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`assign-date-${template.id}`}>Workout date</Label>
          <Input
            id={`assign-date-${template.id}`}
            name="workoutDate"
            type="date"
            required
            defaultValue={defaultDate}
          />
        </div>
      </div>

      <Button type="submit" size="sm" className="mt-3">
        <CalendarBlankIcon />
        Assign workout
      </Button>
    </Form>
  )
}

export function WorkoutsTable({ templates, clients }: WorkoutsTableProps) {
  const [assigningTemplateId, setAssigningTemplateId] = useState<string | null>(null)

  const columns = [
    columnHelper.accessor("title", {
      header: "Title",
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("style", {
      header: "Style",
      cell: (info) => (
        <Badge variant="secondary">{workoutStyleLabels[info.getValue()]}</Badge>
      ),
    }),
    columnHelper.accessor("updatedAt", {
      header: "Updated",
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
        const template = info.row.original
        const isAssigning = assigningTemplateId === template.id

        return (
          <div className="space-y-2">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={clients.length === 0}
                onClick={() =>
                  setAssigningTemplateId(isAssigning ? null : template.id)
                }
              >
                <CalendarBlankIcon />
                {isAssigning ? "Cancel" : "Assign"}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/dashboard/workouts/${template.id}/edit`}>
                  <PencilSimpleIcon />
                  Edit
                </Link>
              </Button>
              <Form
                method="post"
                onSubmit={(event) => {
                  const confirmed = window.confirm(
                    `Delete "${template.title}"? This cannot be undone.`
                  )

                  if (!confirmed) {
                    event.preventDefault()
                  }
                }}
              >
                <input type="hidden" name="intent" value="delete-workout" />
                <input type="hidden" name="templateId" value={template.id} />
                <Button type="submit" variant="destructive" size="sm">
                  <TrashIcon />
                  Delete
                </Button>
              </Form>
            </div>

            {isAssigning ? (
              clients.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add an active client before assigning workouts.
                </p>
              ) : (
                <AssignWorkoutForm template={template} clients={clients} />
              )
            ) : null}
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: templates,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No workouts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first workout template to assign to clients.
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
              <TableCell key={cell.id} className="align-top">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
