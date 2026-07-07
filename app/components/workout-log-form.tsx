import { Form } from "react-router"
import { useMemo, useState } from "react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"
import { workoutBlockTypeLabels } from "~/lib/workout-builder"
import type { WorkoutLogEntryPayload } from "~/lib/workout-log-form"
import type {
  WorkoutLogEntrySelect,
  WorkoutWithDetails,
} from "../../models/workout.server"

type LogRow = WorkoutLogEntryPayload & {
  rowKey: string
  exerciseName: string
  prescriptionMode: "reps" | "time"
  targetLabel: string
}

type WorkoutLogFormProps = {
  workout: WorkoutWithDetails
  defaultEntries?: WorkoutLogEntrySelect[]
  defaultNotes?: string | null
  submitLabel?: string
  mode?: "session" | "edit"
  isSubmitting?: boolean
}

function buildTargetLabel(
  prescriptionMode: "reps" | "time",
  targetReps: number | null,
  targetDurationSeconds: number | null
) {
  if (prescriptionMode === "reps" && targetReps) {
    return `${targetReps} reps`
  }

  if (prescriptionMode === "time" && targetDurationSeconds) {
    return `${targetDurationSeconds}s`
  }

  return "—"
}

function buildInitialRows(
  workout: WorkoutWithDetails,
  defaultEntries?: WorkoutLogEntrySelect[]
): LogRow[] {
  const entryMap = new Map<string, WorkoutLogEntrySelect>()

  for (const entry of defaultEntries ?? []) {
    const key = `${entry.blockExerciseId}-${entry.roundNumber}-${entry.setNumber ?? 0}`
    entryMap.set(key, entry)
  }

  const rows: LogRow[] = []

  for (const block of workout.blocks) {
    const rounds = block.rounds ?? 1

    for (let round = 1; round <= rounds; round += 1) {
      for (const exercise of block.exercises) {
        const rowKey = `${exercise.id}-${round}`
        const existing = entryMap.get(`${exercise.id}-${round}-0`)

        rows.push({
          rowKey,
          blockExerciseId: exercise.id,
          exerciseId: exercise.exerciseId,
          roundNumber: round,
          setNumber: existing?.setNumber ?? undefined,
          exerciseName: exercise.exercise.name,
          prescriptionMode: exercise.prescriptionMode,
          targetLabel: buildTargetLabel(
            exercise.prescriptionMode,
            exercise.targetReps,
            exercise.targetDurationSeconds
          ),
          actualReps: existing?.actualReps ?? undefined,
          actualDurationSeconds: existing?.actualDurationSeconds ?? undefined,
          actualRpe: existing?.actualRpe ?? undefined,
          actualWeight: existing?.actualWeight ?? undefined,
          notes: existing?.notes ?? undefined,
        })
      }
    }
  }

  return rows
}

export function WorkoutLogForm({
  workout,
  defaultEntries,
  defaultNotes,
  submitLabel = "Complete workout",
  mode = "session",
  isSubmitting = false,
}: WorkoutLogFormProps) {
  const [rows, setRows] = useState<LogRow[]>(() =>
    buildInitialRows(workout, defaultEntries)
  )
  const [notes, setNotes] = useState(defaultNotes ?? "")
  const [rescheduleDate, setRescheduleDate] = useState("")

  const payloadJson = useMemo(
    () =>
      JSON.stringify({
        entries: rows.map(({ rowKey: _rowKey, exerciseName: _name, prescriptionMode: _mode, targetLabel: _target, ...entry }) => entry),
        notes: notes || undefined,
      }),
    [rows, notes]
  )

  function updateRow(rowKey: string, updates: Partial<LogRow>) {
    setRows((current) =>
      current.map((row) => (row.rowKey === rowKey ? { ...row, ...updates } : row))
    )
  }

  return (
    <div className="space-y-6">
      {mode === "session" ? (
        <Form method="post" className="space-y-6">
          <input type="hidden" name="payload" value={payloadJson} readOnly />

          <LogFields
            workout={workout}
            rows={rows}
            notes={notes}
            onNotesChange={setNotes}
            onRowChange={updateRow}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="intent" value="complete" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="cancel"
              variant="outline"
              disabled={isSubmitting}
              onClick={(event) => {
                if (
                  !window.confirm(
                    "Cancel this workout session? You can start again from the preview."
                  )
                ) {
                  event.preventDefault()
                }
              }}
            >
              Cancel log
            </Button>
            <Button
              type="submit"
              name="intent"
              value="no-show"
              variant="destructive"
              disabled={isSubmitting}
              onClick={(event) => {
                if (
                  !window.confirm("Mark this session as a no-show? This cannot be undone.")
                ) {
                  event.preventDefault()
                }
              }}
            >
              Mark no-show
            </Button>
          </div>
        </Form>
      ) : (
        <Form method="post" className="space-y-6">
          <input type="hidden" name="payload" value={payloadJson} readOnly />
          <input type="hidden" name="intent" value="update" />

          <LogFields
            workout={workout}
            rows={rows}
            notes={notes}
            onNotesChange={setNotes}
            onRowChange={updateRow}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </Form>
      )}

      {mode === "session" ? (
        <Form method="post" className="rounded-md border bg-muted/10 p-4">
          <input type="hidden" name="intent" value="reschedule" />
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-date">Reschedule to</Label>
              <Input
                id="reschedule-date"
                name="workoutDate"
                type="date"
                required
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={isSubmitting}>
              Reschedule workout
            </Button>
          </div>
        </Form>
      ) : null}
    </div>
  )
}

function LogFields({
  workout,
  rows,
  notes,
  onNotesChange,
  onRowChange,
}: {
  workout: WorkoutWithDetails
  rows: LogRow[]
  notes: string
  onNotesChange: (value: string) => void
  onRowChange: (rowKey: string, updates: Partial<LogRow>) => void
}) {
  return (
    <>
      {workout.blocks.map((block) => {
        const blockRows = rows.filter((row) =>
          block.exercises.some((exercise) => exercise.id === row.blockExerciseId)
        )

        if (blockRows.length === 0) {
          return null
        }

        return (
          <div key={block.id} className="space-y-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">{block.name ?? "Workout block"}</p>
              <Badge variant="secondary" className="mt-1">
                {workoutBlockTypeLabels[block.blockType]}
              </Badge>
            </div>

            <div className="space-y-3">
              {blockRows.map((row) => (
                <div
                  key={row.rowKey}
                  className={cn("rounded-md border bg-background p-3")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{row.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        Round {row.roundNumber} · Target: {row.targetLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {row.prescriptionMode === "reps" ? (
                      <div className="space-y-1.5">
                        <Label>Actual reps</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.actualReps ?? ""}
                          onChange={(event) =>
                            onRowChange(row.rowKey, {
                              actualReps: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label>Actual duration (sec)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.actualDurationSeconds ?? ""}
                          onChange={(event) =>
                            onRowChange(row.rowKey, {
                              actualDurationSeconds: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>Actual RPE</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={row.actualRpe ?? ""}
                        onChange={(event) =>
                          onRowChange(row.rowKey, {
                            actualRpe: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Weight (lbs)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={row.actualWeight ?? ""}
                        onChange={(event) =>
                          onRowChange(row.rowKey, {
                            actualWeight: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="space-y-2">
        <Label htmlFor="log-notes">Session notes (optional)</Label>
        <textarea
          id="log-notes"
          rows={3}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          className={cn(
            "w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-2 text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            "dark:bg-input/30"
          )}
          placeholder="Session notes, adjustments, etc."
        />
      </div>
    </>
  )
}
