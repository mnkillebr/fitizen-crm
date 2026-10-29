import { ArrowsLeftRightIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { Form } from "react-router"
import { useMemo, useRef, useState } from "react"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { cn } from "~/lib/utils"
import { workoutBlockTypeLabels } from "~/lib/workout-builder"
import {
  clampLogInt,
  clampLogRpe,
  exerciseSwapReasonLabels,
  exerciseSwapReasonValues,
  formatWeight,
  parseLogIntInput,
  parseWeightInput,
  snapWeight,
  type ExerciseSwapReasonValue,
  type WorkoutLogEntryPayload,
} from "~/lib/workout-log-form"
import type { ExerciseMuscleGroupValue } from "../../db/schema"
import type {
  LastLoggedSet,
  WorkoutLogEntrySelect,
  WorkoutWithDetails,
} from "../../models/workout.server"

export type SwapExerciseOption = {
  id: string
  name: string
  muscleGroup: ExerciseMuscleGroupValue
}

type LogRow = WorkoutLogEntryPayload & {
  rowKey: string
  exerciseName: string
  originalExerciseName: string
  muscleGroup: ExerciseMuscleGroupValue
  plannedExerciseId: string
  blockRounds: number
  prescriptionMode: "reps" | "time"
  targetLabel: string
  targetReps: number | null
  targetDurationSeconds: number | null
  targetRpe: number | null
  targetWeight: number | null
}

type DefaultLogEntry = WorkoutLogEntrySelect & {
  exercise?: { id: string; name: string }
}

type WorkoutLogFormProps = {
  workout: WorkoutWithDetails
  defaultEntries?: DefaultLogEntry[]
  defaultNotes?: string | null
  submitLabel?: string
  mode?: "session" | "edit"
  isCompleted?: boolean
  allowEdit?: boolean
  isSubmitting?: boolean
  allowExerciseSwap?: boolean
  swapExercises?: SwapExerciseOption[]
  lastLoggedByExerciseId?: Record<string, LastLoggedSet[]>
  /** Hides reschedule / no-show and softens cancel copy for past-session backfill. */
  backfillMode?: boolean
}

type SwapDraft = {
  rowKey: string
  blockExerciseId: string
  roundNumber: number
  blockRounds: number
  muscleGroup: ExerciseMuscleGroupValue
  plannedExerciseId: string
  currentExerciseId: string
  originalExerciseId: string
  originalExerciseName: string
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
  defaultEntries?: DefaultLogEntry[],
  swapExercises: SwapExerciseOption[] = []
): LogRow[] {
  const entryMap = new Map<string, DefaultLogEntry>()
  const exerciseNameById = new Map(
    swapExercises.map((exercise) => [exercise.id, exercise.name])
  )

  for (const entry of defaultEntries ?? []) {
    const key = `${entry.blockExerciseId}-${entry.roundNumber}-${entry.setNumber ?? 0}`
    entryMap.set(key, entry)
    if (entry.exercise) {
      exerciseNameById.set(entry.exercise.id, entry.exercise.name)
    }
  }

  for (const block of workout.blocks) {
    for (const exercise of block.exercises) {
      exerciseNameById.set(exercise.exerciseId, exercise.exercise.name)
    }
  }

  const rows: LogRow[] = []

  for (const block of workout.blocks) {
    const rounds = block.rounds ?? 1

    for (let round = 1; round <= rounds; round += 1) {
      for (const exercise of block.exercises) {
        const rowKey = `${exercise.id}-${round}`
        const existing = entryMap.get(`${exercise.id}-${round}-0`)
        const prescribed = prescribedValuesForExercise(exercise)
        const plannedExerciseId = exercise.exerciseId
        const originalExerciseId =
          existing?.originalExerciseId ?? plannedExerciseId
        const exerciseId = existing?.exerciseId ?? plannedExerciseId
        const swapReason =
          (existing?.swapReason as ExerciseSwapReasonValue | null | undefined) ??
          undefined
        const exerciseName =
          exerciseNameById.get(exerciseId) ?? exercise.exercise.name
        const originalExerciseName =
          exerciseNameById.get(originalExerciseId) ?? exercise.exercise.name

        rows.push({
          rowKey,
          blockExerciseId: exercise.id,
          exerciseId,
          originalExerciseId:
            swapReason || exerciseId !== plannedExerciseId
              ? originalExerciseId
              : undefined,
          swapReason:
            swapReason || exerciseId !== plannedExerciseId
              ? swapReason
              : undefined,
          roundNumber: round,
          setNumber: existing?.setNumber ?? undefined,
          exerciseName,
          originalExerciseName,
          muscleGroup: exercise.exercise.muscleGroup,
          plannedExerciseId,
          blockRounds: rounds,
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

function rowHasSwap(row: LogRow) {
  return Boolean(
    row.swapReason ||
      (row.originalExerciseId && row.originalExerciseId !== row.exerciseId)
  )
}

function resolveLastLogged(
  sets: LastLoggedSet[] | undefined,
  roundNumber: number
): LastLoggedSet | null {
  if (!sets?.length) {
    return null
  }

  const matchingRounds = sets.filter((set) => set.roundNumber === roundNumber)
  if (matchingRounds.length > 0) {
    return matchingRounds[matchingRounds.length - 1] ?? null
  }

  let fallback = sets[0]!
  for (const set of sets) {
    if (set.roundNumber >= fallback.roundNumber) {
      fallback = set
    }
  }
  return fallback
}

function formatLastLoggedLabel(
  values: LastLoggedSet,
  prescriptionMode: "reps" | "time"
) {
  const parts: string[] = []

  if (prescriptionMode === "reps" && values.actualReps != null) {
    parts.push(`${values.actualReps} reps`)
  }

  if (prescriptionMode === "time" && values.actualDurationSeconds != null) {
    parts.push(`${values.actualDurationSeconds}s`)
  }

  if (values.actualWeight != null) {
    parts.push(`${formatWeight(values.actualWeight)} lbs`)
  }

  if (values.actualRpe != null) {
    parts.push(`RPE ${values.actualRpe}`)
  }

  return parts.length ? parts.join(" · ") : null
}

type NumericStepperProps = {
  id?: string
  label: string
  targetHint?: string | null
  lastHint?: string | null
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
  readOnly?: boolean
}

function NumericStepper({
  id,
  label,
  targetHint,
  lastHint,
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
  readOnly = false,
}: NumericStepperProps) {
  function adjust(delta: number) {
    const base = value ?? clampValue(min)
    onChange(clampValue(base + delta))
  }

  const hints = [
    targetHint ? `Target ${targetHint}` : null,
    lastHint ? `Last ${lastHint}` : null,
  ].filter(Boolean)

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        {hints.length > 0 ? (
          <span className="text-[0.65rem] text-muted-foreground">
            {hints.join(" · ")}
          </span>
        ) : null}
      </div>

      {readOnly ? (
        <div
          className={cn(
            "flex h-11 items-center justify-center rounded-md border bg-muted/20 text-base tabular-nums",
            matchesTarget && "border-primary/30 bg-primary/5"
          )}
        >
          {value === undefined ? "—" : formatDisplay(value)}
        </div>
      ) : (
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
      )}
    </div>
  )
}

export function WorkoutLogForm({
  workout,
  defaultEntries,
  defaultNotes,
  submitLabel = "Complete workout",
  mode = "session",
  isCompleted = false,
  allowEdit = true,
  isSubmitting = false,
  allowExerciseSwap = false,
  swapExercises = [],
  lastLoggedByExerciseId = {},
  backfillMode = false,
}: WorkoutLogFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const primarySubmitRef = useRef<HTMLButtonElement>(null)
  const [rows, setRows] = useState<LogRow[]>(() =>
    buildInitialRows(workout, defaultEntries, swapExercises)
  )
  const [notes, setNotes] = useState(defaultNotes ?? "")
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [isEditing, setIsEditing] = useState(!isCompleted && allowEdit)
  const [saveAsTemplate, setSaveAsTemplate] = useState("0")
  const [templateTitle, setTemplateTitle] = useState(
    `${workout.title ?? "Workout"} (modified)`
  )
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [swapDraft, setSwapDraft] = useState<SwapDraft | null>(null)
  const [swapExerciseId, setSwapExerciseId] = useState<string>("")
  const [swapReason, setSwapReason] = useState<ExerciseSwapReasonValue | "">("")
  const [swapScope, setSwapScope] = useState<"current" | "all">("current")

  const isReadOnly = isCompleted && (!allowEdit || !isEditing)

  const payloadJson = useMemo(
    () =>
      JSON.stringify({
        entries: rows.map(
          ({
            rowKey: _rowKey,
            exerciseName: _name,
            originalExerciseName: _originalName,
            muscleGroup: _muscleGroup,
            plannedExerciseId: _planned,
            blockRounds: _rounds,
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

  function startEditing() {
    setIsEditing(true)
  }

  function cancelEditing() {
    setRows(buildInitialRows(workout, defaultEntries, swapExercises))
    setNotes(defaultNotes ?? "")
    setIsEditing(false)
  }

  function openSwapDialog(row: LogRow) {
    setSwapDraft({
      rowKey: row.rowKey,
      blockExerciseId: row.blockExerciseId,
      roundNumber: row.roundNumber,
      blockRounds: row.blockRounds,
      muscleGroup: row.muscleGroup,
      plannedExerciseId: row.plannedExerciseId,
      currentExerciseId: row.exerciseId,
      originalExerciseId: row.originalExerciseId ?? row.plannedExerciseId,
      originalExerciseName: row.originalExerciseName,
    })
    setSwapExerciseId("")
    setSwapReason("")
    setSwapScope(row.blockRounds > 1 ? "all" : "current")
  }

  function applySwap() {
    if (!swapDraft || !swapExerciseId || !swapReason) {
      return
    }

    const replacement = swapExercises.find(
      (exercise) => exercise.id === swapExerciseId
    )
    if (!replacement) {
      return
    }

    setRows((current) =>
      current.map((row) => {
        const matchesRow =
          swapScope === "all"
            ? row.blockExerciseId === swapDraft.blockExerciseId
            : row.rowKey === swapDraft.rowKey

        if (!matchesRow) {
          return row
        }

        return {
          ...row,
          exerciseId: replacement.id,
          exerciseName: replacement.name,
          originalExerciseId: swapDraft.originalExerciseId,
          originalExerciseName: swapDraft.originalExerciseName,
          swapReason,
        }
      })
    )

    setSwapDraft(null)
  }

  function submitPrimary(saveTemplateValue: "0" | "1") {
    setSaveAsTemplate(saveTemplateValue)
    queueMicrotask(() => {
      const input = formRef.current?.elements.namedItem(
        "saveAsTemplate"
      ) as HTMLInputElement | null
      if (input) {
        input.value = saveTemplateValue
      }
      primarySubmitRef.current?.click()
    })
  }

  function requestLogSave() {
    if (allowExerciseSwap && rows.some(rowHasSwap)) {
      setTemplateTitle(`${workout.title ?? "Workout"} (modified)`)
      setTemplateDialogOpen(true)
      return
    }

    submitPrimary("0")
  }

  function confirmTemplateChoice(shouldSaveTemplate: boolean) {
    setTemplateDialogOpen(false)
    submitPrimary(shouldSaveTemplate ? "1" : "0")
  }

  const swapCandidates = swapDraft
    ? swapExercises.filter(
        (exercise) =>
          exercise.muscleGroup === swapDraft.muscleGroup &&
          exercise.id !== swapDraft.currentExerciseId
      )
    : []

  const logFields = (
    <LogFields
      workout={workout}
      rows={rows}
      notes={notes}
      isReadOnly={isReadOnly}
      allowExerciseSwap={allowExerciseSwap && !isReadOnly}
      lastLoggedByExerciseId={lastLoggedByExerciseId}
      onNotesChange={setNotes}
      onRowChange={updateRow}
      onResetRows={resetRowsToPrescription}
      onStartEdit={allowEdit ? startEditing : undefined}
      onSwapExercise={allowExerciseSwap && !isReadOnly ? openSwapDialog : undefined}
    />
  )

  return (
    <div className="space-y-6">
      {mode === "session" ? (
        <Form ref={formRef} method="post" className="space-y-6">
          <input type="hidden" name="payload" value={payloadJson} readOnly />
          <input type="hidden" name="saveAsTemplate" value={saveAsTemplate} readOnly />
          <input type="hidden" name="templateTitle" value={templateTitle} readOnly />

          {logFields}

          <div className="flex flex-wrap gap-2">
            <Button
              ref={primarySubmitRef}
              type="submit"
              name="intent"
              value="complete"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            >
              Complete
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => requestLogSave()}
            >
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
                    backfillMode
                      ? "Cancel this past workout entry? The draft session will be discarded."
                      : "Cancel this workout session? You can start again from the preview."
                  )
                ) {
                  event.preventDefault()
                }
              }}
            >
              {backfillMode ? "Cancel backfill" : "Cancel log"}
            </Button>
            {!backfillMode ? (
              <Button
                type="submit"
                name="intent"
                value="no-show"
                variant="destructive"
                disabled={isSubmitting}
                onClick={(event) => {
                  if (
                    !window.confirm(
                      "Mark this session as a no-show? This cannot be undone."
                    )
                  ) {
                    event.preventDefault()
                  }
                }}
              >
                Mark no-show
              </Button>
            ) : null}
          </div>
        </Form>
      ) : isReadOnly ? (
        logFields
      ) : (
        <Form ref={formRef} method="post" className="space-y-6">
          <input type="hidden" name="payload" value={payloadJson} readOnly />
          <input type="hidden" name="saveAsTemplate" value={saveAsTemplate} readOnly />
          <input type="hidden" name="templateTitle" value={templateTitle} readOnly />

          {logFields}

          <div className="flex flex-wrap gap-2">
            <Button
              ref={primarySubmitRef}
              type="submit"
              name="intent"
              value="update"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            >
              Update
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => requestLogSave()}
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
            {isCompleted ? (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={cancelEditing}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </Form>
      )}

      {mode === "session" && !backfillMode ? (
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

      <Dialog
        open={swapDraft != null}
        onOpenChange={(open) => {
          if (!open) setSwapDraft(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Swap exercise</DialogTitle>
            <DialogDescription>
              Choose a replacement in the same muscle group and a reason for the
              swap.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Replacement exercise</Label>
              <Select
                value={swapExerciseId}
                onValueChange={(value) => setSwapExerciseId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent>
                  {swapCandidates.map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {swapCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No other exercises available in this muscle group.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select
                value={swapReason}
                onValueChange={(value) =>
                  setSwapReason((value as ExerciseSwapReasonValue | null) ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {exerciseSwapReasonValues.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {exerciseSwapReasonLabels[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {swapDraft && swapDraft.blockRounds > 1 ? (
              <div className="space-y-2">
                <Label>Apply to</Label>
                <RadioGroup
                  value={swapScope}
                  onValueChange={(value) => {
                    if (value === "current" || value === "all") {
                      setSwapScope(value)
                    }
                  }}
                  className="gap-3 rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="current" id="swap-scope-current" />
                    <Label htmlFor="swap-scope-current" className="font-normal">
                      This round only (round {swapDraft.roundNumber})
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="all" id="swap-scope-all" />
                    <Label htmlFor="swap-scope-all" className="font-normal">
                      Every round in this circuit
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSwapDraft(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!swapExerciseId || !swapReason || swapCandidates.length === 0}
              onClick={applySwap}
            >
              Swap exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save modified workout as template?</DialogTitle>
            <DialogDescription>
              This session includes exercise swaps. Optionally save a new workout
              template you can assign later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="template-title">Template title</Label>
            <Input
              id="template-title"
              value={templateTitle}
              onChange={(event) => setTemplateTitle(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => confirmTemplateChoice(false)}
            >
              Save log only
            </Button>
            <Button
              type="button"
              disabled={!templateTitle.trim()}
              onClick={() => confirmTemplateChoice(true)}
            >
              Save log + template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LogFields({
  workout,
  rows,
  notes,
  isReadOnly = false,
  allowExerciseSwap = false,
  lastLoggedByExerciseId = {},
  onNotesChange,
  onRowChange,
  onResetRows,
  onStartEdit,
  onSwapExercise,
}: {
  workout: WorkoutWithDetails
  rows: LogRow[]
  notes: string
  isReadOnly?: boolean
  allowExerciseSwap?: boolean
  lastLoggedByExerciseId?: Record<string, LastLoggedSet[]>
  onNotesChange: (value: string) => void
  onRowChange: (rowKey: string, updates: Partial<LogRow>) => void
  onResetRows: (rowKeys: string[]) => void
  onStartEdit?: () => void
  onSwapExercise?: (row: LogRow) => void
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

              {isReadOnly ? (
                onStartEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={onStartEdit}
                  >
                    Edit log
                  </Button>
                ) : null
              ) : (
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
              )}
            </div>

            <div className="space-y-3">
              {blockRows.map((row) => {
                const asPrescribed = rowMatchesPrescription(row)
                const swapped = rowHasSwap(row)
                const lastLogged = resolveLastLogged(
                  lastLoggedByExerciseId[row.exerciseId],
                  row.roundNumber
                )
                const lastLabel = lastLogged
                  ? formatLastLoggedLabel(lastLogged, row.prescriptionMode)
                  : null

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
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{row.exerciseName}</p>
                          {swapped ? (
                            <Badge variant="secondary">Swapped</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Round {row.roundNumber} · {row.targetLabel}
                        </p>
                        {lastLabel ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last · {lastLabel}
                          </p>
                        ) : null}
                        {swapped ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            From {row.originalExerciseName}
                            {row.swapReason
                              ? ` · ${exerciseSwapReasonLabels[row.swapReason]}`
                              : ""}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-1">
                        {allowExerciseSwap && onSwapExercise ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => onSwapExercise(row)}
                          >
                            <ArrowsLeftRightIcon />
                            Swap
                          </Button>
                        ) : null}
                        {isReadOnly ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            disabled={asPrescribed}
                            onClick={() => onResetRows([row.rowKey])}
                          >
                            As prescribed
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {row.prescriptionMode === "reps" ? (
                        <NumericStepper
                          id={`${row.rowKey}-reps`}
                          label="Reps"
                          targetHint={row.targetReps ? String(row.targetReps) : null}
                          lastHint={
                            lastLogged?.actualReps != null
                              ? String(lastLogged.actualReps)
                              : null
                          }
                          value={row.actualReps}
                          onChange={(actualReps) => onRowChange(row.rowKey, { actualReps })}
                          parseInput={(raw) => parseLogIntInput(raw)}
                          clampValue={(value) => clampLogInt(value)}
                          matchesTarget={
                            row.targetReps != null && row.actualReps === row.targetReps
                          }
                          readOnly={isReadOnly}
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
                          lastHint={
                            lastLogged?.actualDurationSeconds != null
                              ? String(lastLogged.actualDurationSeconds)
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
                          readOnly={isReadOnly}
                        />
                      )}

                      <NumericStepper
                        id={`${row.rowKey}-rpe`}
                        label="RPE"
                        targetHint={row.targetRpe ? String(row.targetRpe) : null}
                        lastHint={
                          lastLogged?.actualRpe != null
                            ? String(lastLogged.actualRpe)
                            : null
                        }
                        value={row.actualRpe}
                        onChange={(actualRpe) => onRowChange(row.rowKey, { actualRpe })}
                        min={1}
                        max={10}
                        parseInput={(raw) => parseLogIntInput(raw, { min: 1, max: 10 })}
                        clampValue={(value) => clampLogRpe(value)}
                        matchesTarget={row.targetRpe != null && row.actualRpe === row.targetRpe}
                        readOnly={isReadOnly}
                      />

                      <NumericStepper
                        id={`${row.rowKey}-weight`}
                        label="Weight (lbs)"
                        targetHint={
                          row.targetWeight != null ? formatWeight(row.targetWeight) : null
                        }
                        lastHint={
                          lastLogged?.actualWeight != null
                            ? formatWeight(lastLogged.actualWeight)
                            : null
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
                        readOnly={isReadOnly}
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
        {isReadOnly ? (
          <p className="rounded-md border bg-muted/20 px-2 py-2 text-sm whitespace-pre-wrap">
            {notes.trim() ? notes : "No session notes."}
          </p>
        ) : (
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
        )}
      </div>
    </>
  )
}
