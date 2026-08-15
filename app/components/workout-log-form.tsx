import { MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { Form } from "react-router"
import { useMemo, useState } from "react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"
import { workoutBlockTypeLabels } from "~/lib/workout-builder"
import {
  clampLogInt,
  clampLogRpe,
  formatWeight,
  parseLogIntInput,
  parseWeightInput,
  snapWeight,
  type WorkoutLogEntryPayload,
} from "~/lib/workout-log-form"
import type {
  WorkoutLogEntrySelect,
  WorkoutWithDetails,
} from "../../models/workout.server"

type LogRow = WorkoutLogEntryPayload & {
  rowKey: string
  exerciseName: string
  prescriptionMode: "reps" | "time"
  targetLabel: string
  targetReps: number | null
  targetDurationSeconds: number | null
  targetRpe: number | null
  targetWeight: number | null
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
  targetDurationSeconds: number | null,
  targetRpe: number | null,
  targetWeight: number | null
) {
  const parts: string[] = []

  if (prescriptionMode === "reps" && targetReps) {
    parts.push(`${targetReps} reps`)
  }

  if (prescriptionMode === "time" && targetDurationSeconds) {
    parts.push(`${targetDurationSeconds}s`)
  }

  if (targetRpe) {
    parts.push(`RPE ${targetRpe}`)
  }

  if (targetWeight) {
    parts.push(`${formatWeight(targetWeight)} lbs`)
  }

  return parts.length ? parts.join(" · ") : "—"
}

function prescribedValuesForExercise(
  exercise: WorkoutWithDetails["blocks"][number]["exercises"][number]
) {
  return {
    actualReps: exercise.targetReps ?? undefined,
    actualDurationSeconds: exercise.targetDurationSeconds ?? undefined,
    actualRpe: exercise.targetRpe ?? undefined,
    actualWeight:
      exercise.targetWeight != null ? snapWeight(exercise.targetWeight) : undefined,
  }
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
        const prescribed = prescribedValuesForExercise(exercise)

        rows.push({
          rowKey,
          blockExerciseId: exercise.id,
          exerciseId: exercise.exerciseId,
          roundNumber: round,
          setNumber: existing?.setNumber ?? undefined,
          exerciseName: exercise.exercise.name,
          prescriptionMode: exercise.prescriptionMode,
          targetReps: exercise.targetReps,
          targetDurationSeconds: exercise.targetDurationSeconds,
          targetRpe: exercise.targetRpe,
          targetWeight: exercise.targetWeight,
          targetLabel: buildTargetLabel(
            exercise.prescriptionMode,
            exercise.targetReps,
            exercise.targetDurationSeconds,
            exercise.targetRpe,
            exercise.targetWeight
          ),
          actualReps: existing?.actualReps ?? prescribed.actualReps,
          actualDurationSeconds:
            existing?.actualDurationSeconds ?? prescribed.actualDurationSeconds,
          actualRpe: existing?.actualRpe ?? prescribed.actualRpe,
          actualWeight: existing?.actualWeight ?? prescribed.actualWeight,
          notes: existing?.notes ?? undefined,
        })
      }
    }
  }

  return rows
}

function rowMatchesPrescription(row: LogRow) {
  const repsMatch =
    row.prescriptionMode !== "reps" ||
    row.actualReps === (row.targetReps ?? undefined)
  const durationMatch =
    row.prescriptionMode !== "time" ||
    row.actualDurationSeconds === (row.targetDurationSeconds ?? undefined)
  const rpeMatch = row.actualRpe === (row.targetRpe ?? undefined)
  const weightMatch = row.actualWeight === (row.targetWeight ?? undefined)

  return repsMatch && durationMatch && rpeMatch && weightMatch
}

function prescribedValuesForRow(row: LogRow): Partial<LogRow> {
  return {
    actualReps: row.targetReps ?? undefined,
    actualDurationSeconds: row.targetDurationSeconds ?? undefined,
    actualRpe: row.targetRpe ?? undefined,
    actualWeight:
      row.targetWeight != null ? snapWeight(row.targetWeight) : undefined,
  }
}

type NumericStepperProps = {
  id?: string
  label: string
  targetHint?: string | null
  value: number | undefined
  onChange: (value: number | undefined) => void
  min?: number
  max?: number
  step?: number
  inputMode?: "numeric" | "decimal"
  formatDisplay?: (value: number) => string
  parseInput: (raw: string) => number | undefined
  clampValue: (value: number) => number
  matchesTarget?: boolean
}

function NumericStepper({
  id,
  label,
  targetHint,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  inputMode = "numeric",
  formatDisplay = String,
  parseInput,
  clampValue,
  matchesTarget,
}: NumericStepperProps) {
  function adjust(delta: number) {
    const base = value ?? clampValue(min)
    onChange(clampValue(base + delta))
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        {targetHint ? (
          <span className="text-[0.65rem] text-muted-foreground">Target {targetHint}</span>
        ) : null}
      </div>

      <div
        className={cn(
          "flex items-stretch overflow-hidden rounded-md border bg-background",
          matchesTarget && "border-primary/30 bg-primary/5"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="h-11 w-11 shrink-0 rounded-none border-r"
          onClick={() => adjust(-step)}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <MinusIcon />
        </Button>

        <Input
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          maxLength={inputMode === "decimal" ? 5 : 3}
          className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent text-center text-base tabular-nums focus-visible:ring-0"
          value={value === undefined ? "" : formatDisplay(value)}
          placeholder="—"
          onChange={(event) => onChange(parseInput(event.target.value))}
          onBlur={() => {
            if (value !== undefined) {
              onChange(clampValue(value))
            }
          }}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="h-11 w-11 shrink-0 rounded-none border-l"
          onClick={() => adjust(step)}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  )
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
        entries: rows.map(
          ({
            rowKey: _rowKey,
            exerciseName: _name,
            prescriptionMode: _mode,
            targetLabel: _target,
            targetReps: _targetReps,
            targetDurationSeconds: _targetDurationSeconds,
            targetRpe: _targetRpe,
            targetWeight: _targetWeight,
            ...entry
          }) => entry
        ),
        notes: notes || undefined,
      }),
    [rows, notes]
  )

  function updateRow(rowKey: string, updates: Partial<LogRow>) {
    setRows((current) =>
      current.map((row) => (row.rowKey === rowKey ? { ...row, ...updates } : row))
    )
  }

  function resetRowsToPrescription(rowKeys: string[]) {
    const keySet = new Set(rowKeys)
    setRows((current) =>
      current.map((row) =>
        keySet.has(row.rowKey) ? { ...row, ...prescribedValuesForRow(row) } : row
      )
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
            onResetRows={resetRowsToPrescription}
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
            onResetRows={resetRowsToPrescription}
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
  onResetRows,
}: {
  workout: WorkoutWithDetails
  rows: LogRow[]
  notes: string
  onNotesChange: (value: string) => void
  onRowChange: (rowKey: string, updates: Partial<LogRow>) => void
  onResetRows: (rowKeys: string[]) => void
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

        const allPrescribed = blockRows.every(rowMatchesPrescription)

        return (
          <div key={block.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{block.name ?? "Workout block"}</p>
                <Badge variant="secondary" className="mt-1">
                  {workoutBlockTypeLabels[block.blockType]}
                </Badge>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={allPrescribed}
                onClick={() => onResetRows(blockRows.map((row) => row.rowKey))}
              >
                Log block as prescribed
              </Button>
            </div>

            <div className="space-y-3">
              {blockRows.map((row) => {
                const asPrescribed = rowMatchesPrescription(row)

                return (
                  <div
                    key={row.rowKey}
                    className={cn(
                      "rounded-md border bg-background p-3",
                      asPrescribed && "border-primary/20"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{row.exerciseName}</p>
                        <p className="text-xs text-muted-foreground">
                          Round {row.roundNumber} · {row.targetLabel}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0"
                        disabled={asPrescribed}
                        onClick={() => onResetRows([row.rowKey])}
                      >
                        As prescribed
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {row.prescriptionMode === "reps" ? (
                        <NumericStepper
                          id={`${row.rowKey}-reps`}
                          label="Reps"
                          targetHint={row.targetReps ? String(row.targetReps) : null}
                          value={row.actualReps}
                          onChange={(actualReps) => onRowChange(row.rowKey, { actualReps })}
                          parseInput={(raw) => parseLogIntInput(raw)}
                          clampValue={(value) => clampLogInt(value)}
                          matchesTarget={
                            row.targetReps != null && row.actualReps === row.targetReps
                          }
                        />
                      ) : (
                        <NumericStepper
                          id={`${row.rowKey}-duration`}
                          label="Duration (sec)"
                          targetHint={
                            row.targetDurationSeconds
                              ? String(row.targetDurationSeconds)
                              : null
                          }
                          value={row.actualDurationSeconds}
                          onChange={(actualDurationSeconds) =>
                            onRowChange(row.rowKey, { actualDurationSeconds })
                          }
                          step={5}
                          parseInput={(raw) => parseLogIntInput(raw)}
                          clampValue={(value) => clampLogInt(value)}
                          matchesTarget={
                            row.targetDurationSeconds != null &&
                            row.actualDurationSeconds === row.targetDurationSeconds
                          }
                        />
                      )}

                      <NumericStepper
                        id={`${row.rowKey}-rpe`}
                        label="RPE"
                        targetHint={row.targetRpe ? String(row.targetRpe) : null}
                        value={row.actualRpe}
                        onChange={(actualRpe) => onRowChange(row.rowKey, { actualRpe })}
                        min={1}
                        max={10}
                        parseInput={(raw) => parseLogIntInput(raw, { min: 1, max: 10 })}
                        clampValue={(value) => clampLogRpe(value)}
                        matchesTarget={row.targetRpe != null && row.actualRpe === row.targetRpe}
                      />

                      <NumericStepper
                        id={`${row.rowKey}-weight`}
                        label="Weight (lbs)"
                        targetHint={
                          row.targetWeight != null ? formatWeight(row.targetWeight) : null
                        }
                        value={row.actualWeight}
                        onChange={(actualWeight) => onRowChange(row.rowKey, { actualWeight })}
                        step={0.5}
                        inputMode="decimal"
                        formatDisplay={formatWeight}
                        parseInput={parseWeightInput}
                        clampValue={snapWeight}
                        matchesTarget={
                          row.targetWeight != null && row.actualWeight === row.targetWeight
                        }
                      />
                    </div>
                  </div>
                )
              })}
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
