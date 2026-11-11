import {
  ArrowsLeftRightIcon,
  CaretDownIcon,
  CaretRightIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Form } from "react-router"
import { useMemo, useRef, useState } from "react"

import { ExerciseVideoDialog } from "~/components/exercise-video-dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { cn } from "~/lib/utils"
import {
  prescriptionModeLabels,
  prescriptionModeValues,
  workoutBlockTypeLabels,
} from "~/lib/workout-builder"
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
  type PrescriptionModeValue,
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
  videoUrl?: string | null
}

type LogRow = WorkoutLogEntryPayload & {
  rowKey: string
  exerciseName: string
  videoUrl: string | null
  originalExerciseName: string
  muscleGroup: ExerciseMuscleGroupValue
  plannedExerciseId: string
  plannedPrescriptionMode: PrescriptionModeValue
  blockRounds: number
  isAdjunct: boolean
  prescriptionMode: PrescriptionModeValue
  tempo?: string
  cues?: string
  accessories?: string
  targetLabel: string
  targetReps: number | null
  targetDurationSeconds: number | null
  targetDistance: number | null
  targetRpe: number | null
  targetWeight: number | null
}

function rowGroupKey(row: LogRow) {
  return row.adjunctId ?? row.blockExerciseId ?? row.rowKey
}

type DefaultLogEntry = WorkoutLogEntrySelect & {
  exercise?: { id: string; name: string; videoUrl?: string | null }
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
  blockExerciseId: string
  muscleGroup: ExerciseMuscleGroupValue
  currentExerciseId: string
  originalExerciseId: string
  originalExerciseName: string
}

function buildTargetLabel(
  prescriptionMode: "reps" | "time" | "distance",
  targetReps: number | null,
  targetDurationSeconds: number | null,
  targetDistance: number | null,
  targetRpe: number | null,
  targetWeight: number | null
) {
  const parts: string[] = []

  if (prescriptionMode === "reps" && targetReps) {
    parts.push(`${targetReps} reps`)
  }

  if (prescriptionMode === "time" && targetDurationSeconds) {
    parts.push(`${targetDurationSeconds} seconds`)
  }

  if (prescriptionMode === "distance" && targetDistance) {
    parts.push(`${targetDistance} yards`)
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
    actualDistance: exercise.targetDistance ?? undefined,
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
  const videoUrlById = new Map(
    swapExercises.map((exercise) => [
      exercise.id,
      exercise.videoUrl ?? null,
    ] as const)
  )

  const exerciseMetaById = new Map(
    swapExercises.map((exercise) => [exercise.id, exercise])
  )

  for (const entry of defaultEntries ?? []) {
    if (entry.blockExerciseId) {
      const key = `${entry.blockExerciseId}-${entry.roundNumber}-${entry.setNumber ?? 0}`
      entryMap.set(key, entry)
    }
    if (entry.exercise) {
      exerciseNameById.set(entry.exercise.id, entry.exercise.name)
      videoUrlById.set(entry.exercise.id, entry.exercise.videoUrl ?? null)
    }
  }

  for (const block of workout.blocks) {
    for (const exercise of block.exercises) {
      exerciseNameById.set(exercise.exerciseId, exercise.exercise.name)
      videoUrlById.set(exercise.exerciseId, exercise.exercise.videoUrl ?? null)
    }
  }

  const rows: LogRow[] = []

  for (const block of workout.blocks) {
    const plannedRounds = block.rounds ?? 1
    const blockExerciseIds = new Set(block.exercises.map((exercise) => exercise.id))
    let maxSavedRound = 0
    for (const entry of defaultEntries ?? []) {
      if (entry.blockExerciseId && blockExerciseIds.has(entry.blockExerciseId)) {
        maxSavedRound = Math.max(maxSavedRound, entry.roundNumber)
      }
    }
    const rounds = Math.max(plannedRounds, maxSavedRound, 1)

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
        const videoUrl =
          videoUrlById.get(exerciseId) ?? exercise.exercise.videoUrl ?? null
        const prescriptionMode =
          (existing?.prescriptionMode as PrescriptionModeValue | null | undefined) ??
          exercise.prescriptionMode

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
          videoUrl,
          originalExerciseName,
          muscleGroup: exercise.exercise.muscleGroup,
          plannedExerciseId,
          plannedPrescriptionMode: exercise.prescriptionMode,
          blockRounds: rounds,
          isAdjunct: false,
          prescriptionMode,
          tempo: existing?.tempo ?? exercise.tempo ?? undefined,
          cues: existing?.cues ?? exercise.cues ?? undefined,
          accessories: existing?.accessories ?? exercise.accessories ?? undefined,
          targetReps: exercise.targetReps,
          targetDurationSeconds: exercise.targetDurationSeconds,
          targetDistance: exercise.targetDistance,
          targetRpe: exercise.targetRpe,
          targetWeight: exercise.targetWeight,
          targetLabel: buildTargetLabel(
            exercise.prescriptionMode,
            exercise.targetReps,
            exercise.targetDurationSeconds,
            exercise.targetDistance,
            exercise.targetRpe,
            exercise.targetWeight
          ),
          actualReps: existing?.actualReps ?? prescribed.actualReps,
          actualDurationSeconds:
            existing?.actualDurationSeconds ?? prescribed.actualDurationSeconds,
          actualDistance: existing?.actualDistance ?? prescribed.actualDistance,
          actualRpe: existing?.actualRpe ?? prescribed.actualRpe,
          actualWeight: existing?.actualWeight ?? prescribed.actualWeight,
          notes: existing?.notes ?? undefined,
        })
      }
    }
  }

  const adjunctEntriesById = new Map<string, DefaultLogEntry[]>()
  for (const entry of defaultEntries ?? []) {
    if (!entry.adjunctId || entry.blockExerciseId) {
      continue
    }
    const existing = adjunctEntriesById.get(entry.adjunctId) ?? []
    existing.push(entry)
    adjunctEntriesById.set(entry.adjunctId, existing)
  }

  for (const [adjunctId, adjunctEntries] of adjunctEntriesById) {
    const sorted = [...adjunctEntries].sort(
      (a, b) => a.roundNumber - b.roundNumber
    )
    const blockRounds = Math.max(
      sorted.length,
      ...sorted.map((entry) => entry.roundNumber)
    )

    for (const entry of sorted) {
      const meta = exerciseMetaById.get(entry.exerciseId)
      const exerciseName =
        entry.exercise?.name ??
        exerciseNameById.get(entry.exerciseId) ??
        "Exercise"
      const videoUrl =
        entry.exercise?.videoUrl ??
        videoUrlById.get(entry.exerciseId) ??
        meta?.videoUrl ??
        null
      const prescriptionMode =
        (entry.prescriptionMode as PrescriptionModeValue | null | undefined) ??
        "reps"

      rows.push({
        rowKey: `adjunct-${adjunctId}-${entry.roundNumber}`,
        adjunctId,
        isAdjunct: true,
        exerciseId: entry.exerciseId,
        roundNumber: entry.roundNumber,
        setNumber: entry.setNumber ?? undefined,
        exerciseName,
        videoUrl,
        originalExerciseName: exerciseName,
        muscleGroup: meta?.muscleGroup ?? "core",
        plannedExerciseId: entry.exerciseId,
        plannedPrescriptionMode: prescriptionMode,
        blockRounds,
        prescriptionMode,
        tempo: entry.tempo ?? undefined,
        cues: entry.cues ?? undefined,
        accessories: entry.accessories ?? undefined,
        targetReps: null,
        targetDurationSeconds: null,
        targetDistance: null,
        targetRpe: null,
        targetWeight: null,
        targetLabel: "—",
        actualReps: entry.actualReps ?? undefined,
        actualDurationSeconds: entry.actualDurationSeconds ?? undefined,
        actualDistance: entry.actualDistance ?? undefined,
        actualRpe: entry.actualRpe ?? undefined,
        actualWeight: entry.actualWeight ?? undefined,
        notes: entry.notes ?? undefined,
      })
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
  const distanceMatch = 
    row.prescriptionMode !== "distance" ||
    row.actualDistance === (row.targetDistance ?? undefined)
  const rpeMatch = row.actualRpe === (row.targetRpe ?? undefined)
  const weightMatch = row.actualWeight === (row.targetWeight ?? undefined)

  return repsMatch && durationMatch && distanceMatch && rpeMatch && weightMatch
}

function prescribedValuesForRow(row: LogRow): Partial<LogRow> {
  const shared: Partial<LogRow> = {
    actualRpe: row.targetRpe ?? undefined,
    actualWeight:
      row.targetWeight != null ? snapWeight(row.targetWeight) : undefined,
  }

  if (row.prescriptionMode !== row.plannedPrescriptionMode) {
    return shared
  }

  return {
    ...shared,
    actualReps:
      row.prescriptionMode === "reps" ? (row.targetReps ?? undefined) : undefined,
    actualDurationSeconds:
      row.prescriptionMode === "time"
        ? (row.targetDurationSeconds ?? undefined)
        : undefined,
    actualDistance:
      row.prescriptionMode === "distance"
        ? (row.targetDistance ?? undefined)
        : undefined,
  }
}

function prescriptionModeChange(row: LogRow, mode: PrescriptionModeValue): Partial<LogRow> {
  return {
    prescriptionMode: mode,
    actualReps: mode === "reps" ? row.actualReps : undefined,
    actualDurationSeconds: mode === "time" ? row.actualDurationSeconds : undefined,
    actualDistance: mode === "distance" ? row.actualDistance : undefined,
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
  prescriptionMode: "reps" | "time" | "distance"
) {
  const parts: string[] = []

  if (prescriptionMode === "reps" && values.actualReps != null) {
    parts.push(`${values.actualReps} reps`)
  }

  if (prescriptionMode === "time" && values.actualDurationSeconds != null) {
    parts.push(`${values.actualDurationSeconds} seconds`)
  }

  if (prescriptionMode === "distance" && values.actualDistance != null) {
    parts.push(`${values.actualDistance} yards`)
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
  compact?: boolean
  hideLabel?: boolean
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
  compact = false,
  hideLabel = false,
}: NumericStepperProps) {
  function adjust(delta: number) {
    const base = value ?? clampValue(min)
    onChange(clampValue(base + delta))
  }

  const hints = [
    targetHint ? `Target ${targetHint}` : null,
    lastHint ? `Last ${lastHint}` : null,
  ].filter(Boolean)
  const controlHeight = compact ? "h-9" : "h-11"
  const buttonWidth = compact ? "w-9" : "w-11"
  const textSize = compact ? "text-sm" : "text-base"

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-1.5")}>
      {hideLabel ? null : (
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
      )}

      {readOnly ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-md border bg-muted/20 tabular-nums",
            controlHeight,
            textSize,
            matchesTarget && "border-primary/30 bg-primary/5"
          )}
          aria-label={label}
          title={hints.length > 0 ? hints.join(" · ") : undefined}
        >
          {value === undefined ? "—" : formatDisplay(value)}
        </div>
      ) : (
        <div
          className={cn(
            "flex items-stretch overflow-hidden rounded-md border bg-background",
            matchesTarget && "border-primary/30 bg-primary/5"
          )}
          title={hints.length > 0 ? hints.join(" · ") : undefined}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              controlHeight,
              buttonWidth,
              "shrink-0 rounded-none border-r"
            )}
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
            aria-label={label}
            className={cn(
              "min-w-0 flex-1 rounded-none border-0 bg-transparent text-center tabular-nums focus-visible:ring-0",
              controlHeight,
              textSize
            )}
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
            size="icon"
            className={cn(
              controlHeight,
              buttonWidth,
              "shrink-0 rounded-none border-l"
            )}
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

function groupRowsByBlockExercise(
  blockExercises: WorkoutWithDetails["blocks"][number]["exercises"],
  blockRows: LogRow[]
) {
  const rowsByBlockExerciseId = new Map<string, LogRow[]>()
  for (const row of blockRows) {
    if (!row.blockExerciseId) {
      continue
    }
    const existing = rowsByBlockExerciseId.get(row.blockExerciseId) ?? []
    existing.push(row)
    rowsByBlockExerciseId.set(row.blockExerciseId, existing)
  }

  return blockExercises
    .map((exercise) => {
      const exerciseRows = rowsByBlockExerciseId.get(exercise.id) ?? []
      return {
        blockExerciseId: exercise.id,
        rows: [...exerciseRows].sort((a, b) => a.roundNumber - b.roundNumber),
      }
    })
    .filter((group) => group.rows.length > 0)
}

function primaryMetricLabel(mode: PrescriptionModeValue) {
  switch (mode) {
    case "reps":
      return "Reps"
    case "time":
      return "Sec"
    case "distance":
      return "Yds"
  }
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
  const [adjunctDialogOpen, setAdjunctDialogOpen] = useState(false)
  const [adjunctExerciseId, setAdjunctExerciseId] = useState("")
  const [adjunctMode, setAdjunctMode] =
    useState<PrescriptionModeValue>("reps")
  const [adjunctSetCount, setAdjunctSetCount] = useState("1")
  const [adjunctTempo, setAdjunctTempo] = useState("")
  const [adjunctAccessories, setAdjunctAccessories] = useState("")
  const [adjunctCues, setAdjunctCues] = useState("")

  const isReadOnly = isCompleted && (!allowEdit || !isEditing)

  const payloadJson = useMemo(
    () =>
      JSON.stringify({
        entries: rows.map(
          ({
            rowKey: _rowKey,
            exerciseName: _name,
            videoUrl: _videoUrl,
            originalExerciseName: _originalName,
            muscleGroup: _muscleGroup,
            plannedExerciseId: _planned,
            plannedPrescriptionMode: _plannedMode,
            blockRounds: _rounds,
            isAdjunct: _isAdjunct,
            targetLabel: _target,
            targetReps: _targetReps,
            targetDurationSeconds: _targetDurationSeconds,
            targetDistance: _targetDistance,
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

  function updateExerciseRows(groupKey: string, updates: Partial<LogRow>) {
    setRows((current) =>
      current.map((row) =>
        rowGroupKey(row) === groupKey ? { ...row, ...updates } : row
      )
    )
  }

  function changeExercisePrescriptionMode(
    groupKey: string,
    mode: PrescriptionModeValue
  ) {
    setRows((current) =>
      current.map((row) =>
        rowGroupKey(row) === groupKey
          ? { ...row, ...prescriptionModeChange(row, mode) }
          : row
      )
    )
  }

  function resetRowsToPrescription(rowKeys: string[]) {
    const keySet = new Set(rowKeys)
    setRows((current) =>
      current.map((row) => {
        if (!keySet.has(row.rowKey)) {
          return row
        }

        return {
          ...row,
          actualReps: undefined,
          actualDurationSeconds: undefined,
          actualDistance: undefined,
          ...prescribedValuesForRow(row),
        }
      })
    )
  }

  function addAdjunctExercise(input: {
    exerciseId: string
    name: string
    videoUrl?: string | null
    muscleGroup: ExerciseMuscleGroupValue
    prescriptionMode: PrescriptionModeValue
    setCount: number
    tempo?: string
    cues?: string
    accessories?: string
  }) {
    const adjunctId = crypto.randomUUID()
    const setCount = Math.min(20, Math.max(1, Math.round(input.setCount)))
    const newRows: LogRow[] = []

    for (let round = 1; round <= setCount; round += 1) {
      newRows.push({
        rowKey: `adjunct-${adjunctId}-${round}`,
        adjunctId,
        isAdjunct: true,
        exerciseId: input.exerciseId,
        roundNumber: round,
        exerciseName: input.name,
        videoUrl: input.videoUrl ?? null,
        originalExerciseName: input.name,
        muscleGroup: input.muscleGroup,
        plannedExerciseId: input.exerciseId,
        plannedPrescriptionMode: input.prescriptionMode,
        blockRounds: setCount,
        prescriptionMode: input.prescriptionMode,
        tempo: input.tempo,
        cues: input.cues,
        accessories: input.accessories,
        notes: undefined,
        targetReps: null,
        targetDurationSeconds: null,
        targetDistance: null,
        targetRpe: null,
        targetWeight: null,
        targetLabel: "—",
      })
    }

    setRows((current) => [...current, ...newRows])
  }

  function addAdjunctSet(adjunctId: string) {
    setRows((current) => {
      const adjunctRows = current.filter((row) => row.adjunctId === adjunctId)
      if (adjunctRows.length === 0) {
        return current
      }

      const maxRound = adjunctRows.reduce(
        (max, row) => Math.max(max, row.roundNumber),
        0
      )
      const nextRound = maxRound + 1
      const latest = [...adjunctRows].sort(
        (a, b) => b.roundNumber - a.roundNumber
      )[0]!

      const updated = current.map((row) =>
        row.adjunctId === adjunctId
          ? { ...row, blockRounds: nextRound }
          : row
      )

      return [
        ...updated,
        {
          ...latest,
          rowKey: `adjunct-${adjunctId}-${nextRound}`,
          roundNumber: nextRound,
          blockRounds: nextRound,
          setNumber: undefined,
          notes: undefined,
          actualReps: undefined,
          actualDurationSeconds: undefined,
          actualDistance: undefined,
          actualRpe: undefined,
          actualWeight: undefined,
        },
      ]
    })
  }

  function dropAdjunctSet(adjunctId: string) {
    setRows((current) => {
      const adjunctRows = current.filter((row) => row.adjunctId === adjunctId)
      const maxRound = adjunctRows.reduce(
        (max, row) => Math.max(max, row.roundNumber),
        0
      )

      if (maxRound <= 1) {
        return current
      }

      const lastRoundRows = adjunctRows.filter(
        (row) => row.roundNumber === maxRound
      )
      const hasCustomValues = lastRoundRows.some(
        (row) => !rowMatchesPrescription(row)
      )
      if (
        hasCustomValues &&
        !window.confirm(
          `Drop set ${maxRound}? Logged values for that set will be discarded.`
        )
      ) {
        return current
      }

      const newBlockRounds = maxRound - 1
      return current
        .filter(
          (row) =>
            !(row.adjunctId === adjunctId && row.roundNumber === maxRound)
        )
        .map((row) =>
          row.adjunctId === adjunctId
            ? { ...row, blockRounds: newBlockRounds }
            : row
        )
    })
  }

  function removeAdjunct(adjunctId: string) {
    if (!window.confirm("Remove this one-off exercise from the session log?")) {
      return
    }
    setRows((current) => current.filter((row) => row.adjunctId !== adjunctId))
  }

  function addBlockRound(blockId: string) {
    const block = workout.blocks.find((candidate) => candidate.id === blockId)
    if (!block) {
      return
    }

    const blockExerciseIds = new Set(block.exercises.map((exercise) => exercise.id))

    setRows((current) => {
      const blockRows = current.filter(
        (row) =>
          row.blockExerciseId != null &&
          blockExerciseIds.has(row.blockExerciseId)
      )
      if (blockRows.length === 0) {
        return current
      }

      const maxRound = blockRows.reduce(
        (max, row) => Math.max(max, row.roundNumber),
        0
      )
      const nextRound = maxRound + 1
      const newBlockRounds = nextRound

      const updated = current.map((row) =>
        row.blockExerciseId != null && blockExerciseIds.has(row.blockExerciseId)
          ? { ...row, blockRounds: newBlockRounds }
          : row
      )

      const newRows: LogRow[] = []
      for (const exercise of block.exercises) {
        const latest = [...blockRows]
          .filter((row) => row.blockExerciseId === exercise.id)
          .sort((a, b) => b.roundNumber - a.roundNumber)[0]

        if (!latest) {
          continue
        }

        newRows.push({
          ...latest,
          rowKey: `${exercise.id}-${nextRound}`,
          roundNumber: nextRound,
          blockRounds: newBlockRounds,
          setNumber: undefined,
          notes: undefined,
          actualReps: undefined,
          actualDurationSeconds: undefined,
          actualDistance: undefined,
          ...prescribedValuesForRow(latest),
        })
      }

      return [...updated, ...newRows]
    })
  }

  function dropBlockRound(blockId: string) {
    const block = workout.blocks.find((candidate) => candidate.id === blockId)
    if (!block) {
      return
    }

    const blockExerciseIds = new Set(block.exercises.map((exercise) => exercise.id))

    setRows((current) => {
      const blockRows = current.filter(
        (row) =>
          row.blockExerciseId != null &&
          blockExerciseIds.has(row.blockExerciseId)
      )
      const maxRound = blockRows.reduce(
        (max, row) => Math.max(max, row.roundNumber),
        0
      )

      if (maxRound <= 1) {
        return current
      }

      const lastRoundRows = blockRows.filter((row) => row.roundNumber === maxRound)
      const hasCustomValues = lastRoundRows.some((row) => !rowMatchesPrescription(row))
      if (
        hasCustomValues &&
        !window.confirm(
          `Drop round ${maxRound}? Logged values for that round will be discarded.`
        )
      ) {
        return current
      }

      const newBlockRounds = maxRound - 1
      return current
        .filter(
          (row) =>
            !(
              row.blockExerciseId != null &&
              blockExerciseIds.has(row.blockExerciseId) &&
              row.roundNumber === maxRound
            )
        )
        .map((row) =>
          row.blockExerciseId != null &&
          blockExerciseIds.has(row.blockExerciseId)
            ? { ...row, blockRounds: newBlockRounds }
            : row
        )
    })
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
    if (!row.blockExerciseId || row.isAdjunct) {
      return
    }

    setSwapDraft({
      blockExerciseId: row.blockExerciseId,
      muscleGroup: row.muscleGroup,
      currentExerciseId: row.exerciseId,
      originalExerciseId: row.originalExerciseId ?? row.plannedExerciseId,
      originalExerciseName: row.originalExerciseName,
    })
    setSwapExerciseId("")
    setSwapReason("")
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
        if (row.blockExerciseId !== swapDraft.blockExerciseId) {
          return row
        }

        return {
          ...row,
          exerciseId: replacement.id,
          exerciseName: replacement.name,
          videoUrl: replacement.videoUrl ?? null,
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

  function openAdjunctDialog() {
    setAdjunctExerciseId("")
    setAdjunctMode("reps")
    setAdjunctSetCount("1")
    setAdjunctTempo("")
    setAdjunctAccessories("")
    setAdjunctCues("")
    setAdjunctDialogOpen(true)
  }

  function confirmAddAdjunct() {
    const selected = swapExercises.find(
      (exercise) => exercise.id === adjunctExerciseId
    )
    if (!selected) {
      return
    }

    const setCount = Number(adjunctSetCount)
    addAdjunctExercise({
      exerciseId: selected.id,
      name: selected.name,
      videoUrl: selected.videoUrl,
      muscleGroup: selected.muscleGroup,
      prescriptionMode: adjunctMode,
      setCount: Number.isFinite(setCount) ? setCount : 1,
      tempo: adjunctTempo.trim() || undefined,
      accessories: adjunctAccessories.trim() || undefined,
      cues: adjunctCues.trim() || undefined,
    })
    setAdjunctDialogOpen(false)
  }

  const logFields = (
    <LogFields
      workout={workout}
      rows={rows}
      notes={notes}
      isReadOnly={isReadOnly}
      allowExerciseSwap={allowExerciseSwap && !isReadOnly}
      swapExercises={swapExercises}
      lastLoggedByExerciseId={lastLoggedByExerciseId}
      onNotesChange={setNotes}
      onRowChange={updateRow}
      onExerciseRowsChange={updateExerciseRows}
      onExercisePrescriptionModeChange={changeExercisePrescriptionMode}
      onResetRows={resetRowsToPrescription}
      onAddBlockRound={addBlockRound}
      onDropBlockRound={dropBlockRound}
      onAddAdjunct={isReadOnly ? undefined : openAdjunctDialog}
      onAddAdjunctSet={addAdjunctSet}
      onDropAdjunctSet={dropAdjunctSet}
      onRemoveAdjunct={removeAdjunct}
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
              Replace this exercise for every round in the circuit. Choose a
              replacement in the same muscle group and a reason for the swap.
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

      <Dialog open={adjunctDialogOpen} onOpenChange={setAdjunctDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add one-off exercise</DialogTitle>
            <DialogDescription>
              Log a quick corrective or improvisation for this session only. It
              will not change the planned workout or templates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Exercise</Label>
              <Select
                value={adjunctExerciseId}
                onValueChange={(value) => setAdjunctExerciseId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent>
                  {swapExercises.map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select
                  value={adjunctMode}
                  onValueChange={(value) =>
                    setAdjunctMode(value as PrescriptionModeValue)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {prescriptionModeValues.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {prescriptionModeLabels[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adjunct-set-count">Sets</Label>
                <Input
                  id="adjunct-set-count"
                  type="number"
                  min={1}
                  max={20}
                  value={adjunctSetCount}
                  onChange={(event) => setAdjunctSetCount(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjunct-tempo">Tempo (optional)</Label>
              <Input
                id="adjunct-tempo"
                value={adjunctTempo}
                onChange={(event) => setAdjunctTempo(event.target.value)}
                placeholder="3-1-2-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjunct-accessories">Accessories (optional)</Label>
              <Input
                id="adjunct-accessories"
                value={adjunctAccessories}
                onChange={(event) => setAdjunctAccessories(event.target.value)}
                placeholder="Band, pad, etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjunct-cues">Cues (optional)</Label>
              <Input
                id="adjunct-cues"
                value={adjunctCues}
                onChange={(event) => setAdjunctCues(event.target.value)}
                placeholder="Brace, soft knees..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdjunctDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!adjunctExerciseId}
              onClick={confirmAddAdjunct}
            >
              Add exercise
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

function groupAdjunctRows(rows: LogRow[]) {
  const groups = new Map<string, LogRow[]>()
  for (const row of rows) {
    if (!row.isAdjunct || !row.adjunctId) {
      continue
    }
    const existing = groups.get(row.adjunctId) ?? []
    existing.push(row)
    groups.set(row.adjunctId, existing)
  }

  return [...groups.entries()].map(([adjunctId, adjunctRows]) => ({
    adjunctId,
    rows: [...adjunctRows].sort((a, b) => a.roundNumber - b.roundNumber),
  }))
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
  onExerciseRowsChange,
  onExercisePrescriptionModeChange,
  onResetRows,
  onAddBlockRound,
  onDropBlockRound,
  onAddAdjunct,
  onAddAdjunctSet,
  onDropAdjunctSet,
  onRemoveAdjunct,
  onStartEdit,
  onSwapExercise,
}: {
  workout: WorkoutWithDetails
  rows: LogRow[]
  notes: string
  isReadOnly?: boolean
  allowExerciseSwap?: boolean
  swapExercises?: SwapExerciseOption[]
  lastLoggedByExerciseId?: Record<string, LastLoggedSet[]>
  onNotesChange: (value: string) => void
  onRowChange: (rowKey: string, updates: Partial<LogRow>) => void
  onExerciseRowsChange: (groupKey: string, updates: Partial<LogRow>) => void
  onExercisePrescriptionModeChange: (
    groupKey: string,
    mode: PrescriptionModeValue
  ) => void
  onResetRows: (rowKeys: string[]) => void
  onAddBlockRound: (blockId: string) => void
  onDropBlockRound: (blockId: string) => void
  onAddAdjunct?: () => void
  onAddAdjunctSet: (adjunctId: string) => void
  onDropAdjunctSet: (adjunctId: string) => void
  onRemoveAdjunct: (adjunctId: string) => void
  onStartEdit?: () => void
  onSwapExercise?: (row: LogRow) => void
}) {
  const [expandedByBlockId, setExpandedByBlockId] = useState<Record<string, boolean>>(
    {}
  )
  const [additionsExpanded, setAdditionsExpanded] = useState(true)
  const adjunctGroups = groupAdjunctRows(rows)

  function isBlockExpanded(blockId: string) {
    return expandedByBlockId[blockId] !== false
  }

  function toggleBlockExpanded(blockId: string) {
    setExpandedByBlockId((current) => ({
      ...current,
      // Default is expanded (undefined); collapsed only when explicitly false.
      [blockId]: current[blockId] === false,
    }))
  }

  return (
    <>
      {workout.notes ? (
        <p className="text-sm text-muted-foreground">{workout.notes}</p>
      ) : null}

      {workout.blocks.map((block) => {
        const blockRows = rows.filter(
          (row) =>
            !row.isAdjunct &&
            row.blockExerciseId != null &&
            block.exercises.some((exercise) => exercise.id === row.blockExerciseId)
        )

        if (blockRows.length === 0) {
          return null
        }

        const allPrescribed = blockRows.every(rowMatchesPrescription)
        const currentRounds = blockRows.reduce(
          (max, row) => Math.max(max, row.roundNumber),
          0
        )
        const exerciseGroups = groupRowsByBlockExercise(block.exercises, blockRows)
        const isExpanded = isBlockExpanded(block.id)

        return (
          <div key={block.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{block.name ?? "Workout block"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {workoutBlockTypeLabels[block.blockType]}
                  </Badge>
                  <Badge variant="outline">{currentRounds} rounds</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => toggleBlockExpanded(block.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`block-${block.id}-exercises`}
                  >
                    {isExpanded ? <CaretDownIcon /> : <CaretRightIcon />}
                    {isExpanded ? "Collapse" : "Expand"}
                  </Button>
                </div>
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
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => onAddBlockRound(block.id)}
                  >
                    <PlusIcon />
                    Add round
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={currentRounds <= 1}
                    onClick={() => onDropBlockRound(block.id)}
                  >
                    <MinusIcon />
                    Drop round
                  </Button>
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
              )}
            </div>

            {block.notes ? (
              <p className="text-sm text-muted-foreground">{block.notes}</p>
            ) : null}

            <div id={`block-${block.id}-exercises`} className="space-y-3">
              {exerciseGroups.map(({ blockExerciseId, rows: exerciseRows }) => {
                const leadRow = exerciseRows[0]!
                const swapped = rowHasSwap(leadRow)
                const lastLoggedSummary = resolveLastLogged(
                  lastLoggedByExerciseId[leadRow.exerciseId],
                  leadRow.roundNumber
                )
                const lastLabel = lastLoggedSummary
                  ? formatLastLoggedLabel(
                      lastLoggedSummary,
                      leadRow.prescriptionMode
                    )
                  : null
                const primaryLabel = primaryMetricLabel(leadRow.prescriptionMode)

                if (!isExpanded) {
                  return (
                    <div
                      key={blockExerciseId}
                      className="rounded-md border bg-background px-3 py-2"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <ExerciseVideoDialog
                          exerciseName={leadRow.exerciseName}
                          videoUrl={leadRow.videoUrl}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {leadRow.exerciseName}
                            </p>
                            {swapped ? (
                              <Badge variant="secondary">Swapped</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Planned {leadRow.targetLabel}
                            {leadRow.tempo ? ` · Tempo ${leadRow.tempo}` : ""}
                            {leadRow.accessories
                              ? ` · ${leadRow.accessories}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={blockExerciseId}
                    className="space-y-3 rounded-md border bg-background p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                        <ExerciseVideoDialog
                          exerciseName={leadRow.exerciseName}
                          videoUrl={leadRow.videoUrl}
                        />
                        <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{leadRow.exerciseName}</p>
                          {swapped ? (
                            <Badge variant="secondary">Swapped</Badge>
                          ) : null}
                          {leadRow.tempo && isReadOnly ? (
                            <Badge variant="outline">Tempo {leadRow.tempo}</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Planned {leadRow.targetLabel}
                        </p>
                        {lastLabel ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last · {lastLabel}
                          </p>
                        ) : null}
                        {swapped ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            From {leadRow.originalExerciseName}
                            {leadRow.swapReason
                              ? ` · ${exerciseSwapReasonLabels[leadRow.swapReason]}`
                              : ""}
                          </p>
                        ) : null}
                        {isReadOnly && leadRow.accessories ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Accessories: {leadRow.accessories}
                          </p>
                        ) : null}
                        {isReadOnly && leadRow.cues ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {leadRow.cues}
                          </p>
                        ) : null}
                        </div>
                      </div>

                      {allowExerciseSwap && onSwapExercise ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => onSwapExercise(leadRow)}
                        >
                          <ArrowsLeftRightIcon />
                          Swap
                        </Button>
                      ) : null}
                    </div>

                    {isReadOnly ? null : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`${blockExerciseId}-mode`}>Mode</Label>
                          <Select
                            value={leadRow.prescriptionMode}
                            onValueChange={(value) =>
                              onExercisePrescriptionModeChange(
                                blockExerciseId,
                                value as PrescriptionModeValue
                              )
                            }
                          >
                            <SelectTrigger
                              id={`${blockExerciseId}-mode`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {prescriptionModeValues.map((mode) => (
                                <SelectItem key={mode} value={mode}>
                                  {prescriptionModeLabels[mode]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`${blockExerciseId}-tempo`}>Tempo</Label>
                          <Input
                            id={`${blockExerciseId}-tempo`}
                            value={leadRow.tempo ?? ""}
                            onChange={(event) =>
                              onExerciseRowsChange(blockExerciseId, {
                                tempo: event.target.value || undefined,
                              })
                            }
                            placeholder="3-1-2-0"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`${blockExerciseId}-accessories`}>
                            Accessories
                          </Label>
                          <Input
                            id={`${blockExerciseId}-accessories`}
                            value={leadRow.accessories ?? ""}
                            onChange={(event) =>
                              onExerciseRowsChange(blockExerciseId, {
                                accessories: event.target.value || undefined,
                              })
                            }
                            placeholder="Wide grip, V-bar, etc."
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`${blockExerciseId}-cues`}>Cues</Label>
                          <Input
                            id={`${blockExerciseId}-cues`}
                            value={leadRow.cues ?? ""}
                            onChange={(event) =>
                              onExerciseRowsChange(blockExerciseId, {
                                cues: event.target.value || undefined,
                              })
                            }
                            placeholder="Brace, drive through heels..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="hidden grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 px-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                        <span>#</span>
                        <span>{primaryLabel}</span>
                        <span>RPE</span>
                        <span>Lbs</span>
                        <span className="sr-only">Actions</span>
                      </div>

                      {exerciseRows.map((row) => {
                        const asPrescribed = rowMatchesPrescription(row)
                        const lastLogged = resolveLastLogged(
                          lastLoggedByExerciseId[row.exerciseId],
                          row.roundNumber
                        )

                        return (
                          <div
                            key={row.rowKey}
                            className={cn(
                              "rounded-md border bg-muted/10 p-2",
                              asPrescribed && "border-primary/20 bg-primary/5"
                            )}
                          >
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                              <div className="flex h-9 w-8 items-center justify-center rounded-full border bg-background text-xs font-medium tabular-nums">
                                {row.roundNumber}
                              </div>

                              <div className="min-w-0 space-y-2 sm:contents">
                                <div className="min-w-0">
                                  <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                                    {primaryLabel}
                                  </p>
                                  {row.prescriptionMode === "reps" ? (
                                    <NumericStepper
                                      id={`${row.rowKey}-reps`}
                                      label="Reps"
                                      hideLabel
                                      compact
                                      targetHint={
                                        row.targetReps ? String(row.targetReps) : null
                                      }
                                      lastHint={
                                        lastLogged?.actualReps != null
                                          ? String(lastLogged.actualReps)
                                          : null
                                      }
                                      value={row.actualReps}
                                      onChange={(actualReps) =>
                                        onRowChange(row.rowKey, { actualReps })
                                      }
                                      parseInput={(raw) => parseLogIntInput(raw)}
                                      clampValue={(value) => clampLogInt(value)}
                                      matchesTarget={
                                        row.targetReps != null &&
                                        row.actualReps === row.targetReps
                                      }
                                      readOnly={isReadOnly}
                                    />
                                  ) : row.prescriptionMode === "time" ? (
                                    <NumericStepper
                                      id={`${row.rowKey}-duration`}
                                      label="Duration (sec)"
                                      hideLabel
                                      compact
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
                                        onRowChange(row.rowKey, {
                                          actualDurationSeconds,
                                        })
                                      }
                                      step={5}
                                      parseInput={(raw) => parseLogIntInput(raw)}
                                      clampValue={(value) => clampLogInt(value)}
                                      matchesTarget={
                                        row.targetDurationSeconds != null &&
                                        row.actualDurationSeconds ===
                                          row.targetDurationSeconds
                                      }
                                      readOnly={isReadOnly}
                                    />
                                  ) : (
                                    <NumericStepper
                                      id={`${row.rowKey}-distance`}
                                      label="Distance (yds)"
                                      hideLabel
                                      compact
                                      targetHint={
                                        row.targetDistance
                                          ? String(row.targetDistance)
                                          : null
                                      }
                                      lastHint={
                                        lastLogged?.actualDistance != null
                                          ? String(lastLogged.actualDistance)
                                          : null
                                      }
                                      value={row.actualDistance}
                                      onChange={(actualDistance) =>
                                        onRowChange(row.rowKey, { actualDistance })
                                      }
                                      step={5}
                                      parseInput={(raw) => parseLogIntInput(raw)}
                                      clampValue={(value) => clampLogInt(value)}
                                      matchesTarget={
                                        row.targetDistance != null &&
                                        row.actualDistance === row.targetDistance
                                      }
                                      readOnly={isReadOnly}
                                    />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                                    RPE
                                  </p>
                                  <NumericStepper
                                    id={`${row.rowKey}-rpe`}
                                    label="RPE"
                                    hideLabel
                                    compact
                                    targetHint={
                                      row.targetRpe ? String(row.targetRpe) : null
                                    }
                                    lastHint={
                                      lastLogged?.actualRpe != null
                                        ? String(lastLogged.actualRpe)
                                        : null
                                    }
                                    value={row.actualRpe}
                                    onChange={(actualRpe) =>
                                      onRowChange(row.rowKey, { actualRpe })
                                    }
                                    min={1}
                                    max={10}
                                    parseInput={(raw) =>
                                      parseLogIntInput(raw, { min: 1, max: 10 })
                                    }
                                    clampValue={(value) => clampLogRpe(value)}
                                    matchesTarget={
                                      row.targetRpe != null &&
                                      row.actualRpe === row.targetRpe
                                    }
                                    readOnly={isReadOnly}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                                    Lbs
                                  </p>
                                  <NumericStepper
                                    id={`${row.rowKey}-weight`}
                                    label="Weight (lbs)"
                                    hideLabel
                                    compact
                                    targetHint={
                                      row.targetWeight != null
                                        ? formatWeight(row.targetWeight)
                                        : null
                                    }
                                    lastHint={
                                      lastLogged?.actualWeight != null
                                        ? formatWeight(lastLogged.actualWeight)
                                        : null
                                    }
                                    value={row.actualWeight}
                                    onChange={(actualWeight) =>
                                      onRowChange(row.rowKey, { actualWeight })
                                    }
                                    step={0.5}
                                    inputMode="decimal"
                                    formatDisplay={formatWeight}
                                    parseInput={parseWeightInput}
                                    clampValue={snapWeight}
                                    matchesTarget={
                                      row.targetWeight != null &&
                                      row.actualWeight === row.targetWeight
                                    }
                                    readOnly={isReadOnly}
                                  />
                                </div>
                              </div>

                              {isReadOnly ? (
                                <div className="col-span-2 sm:col-span-1" />
                              ) : (
                                <div className="col-span-2 flex justify-end sm:col-span-1">
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
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">Session additions</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {adjunctGroups.length} one-off
                {adjunctGroups.length === 1 ? "" : "s"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setAdditionsExpanded((current) => !current)}
                aria-expanded={additionsExpanded}
              >
                {additionsExpanded ? <CaretDownIcon /> : <CaretRightIcon />}
                {additionsExpanded ? "Collapse" : "Expand"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Quick correctives logged for this session only.
            </p>
          </div>

          {onAddAdjunct ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onAddAdjunct}
            >
              <PlusIcon />
              Add exercise
            </Button>
          ) : null}
        </div>

        {additionsExpanded ? (
          adjunctGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one-off exercises yet.
            </p>
          ) : (
            <div className="space-y-3">
              {adjunctGroups.map(({ adjunctId, rows: adjunctRows }) => {
                const leadRow = adjunctRows[0]!
                const primaryLabel = primaryMetricLabel(leadRow.prescriptionMode)
                const setCount = adjunctRows.reduce(
                  (max, row) => Math.max(max, row.roundNumber),
                  0
                )

                return (
                  <div
                    key={adjunctId}
                    className="space-y-3 rounded-md border bg-background p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
                        <ExerciseVideoDialog
                          exerciseName={leadRow.exerciseName}
                          videoUrl={leadRow.videoUrl}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {leadRow.exerciseName}
                            </p>
                            <Badge variant="secondary">One-off</Badge>
                            {leadRow.tempo && isReadOnly ? (
                              <Badge variant="outline">Tempo {leadRow.tempo}</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {setCount} set{setCount === 1 ? "" : "s"} ·{" "}
                            {prescriptionModeLabels[leadRow.prescriptionMode]}
                          </p>
                          {isReadOnly && leadRow.accessories ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Accessories: {leadRow.accessories}
                            </p>
                          ) : null}
                          {isReadOnly && leadRow.cues ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {leadRow.cues}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {isReadOnly ? null : (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => onAddAdjunctSet(adjunctId)}
                          >
                            <PlusIcon />
                            Add set
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={setCount <= 1}
                            onClick={() => onDropAdjunctSet(adjunctId)}
                          >
                            <MinusIcon />
                            Drop set
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => onRemoveAdjunct(adjunctId)}
                          >
                            <TrashIcon />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>

                    {isReadOnly ? null : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`${adjunctId}-mode`}>Mode</Label>
                          <Select
                            value={leadRow.prescriptionMode}
                            onValueChange={(value) =>
                              onExercisePrescriptionModeChange(
                                adjunctId,
                                value as PrescriptionModeValue
                              )
                            }
                          >
                            <SelectTrigger
                              id={`${adjunctId}-mode`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {prescriptionModeValues.map((mode) => (
                                <SelectItem key={mode} value={mode}>
                                  {prescriptionModeLabels[mode]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`${adjunctId}-tempo`}>Tempo</Label>
                          <Input
                            id={`${adjunctId}-tempo`}
                            value={leadRow.tempo ?? ""}
                            onChange={(event) =>
                              onExerciseRowsChange(adjunctId, {
                                tempo: event.target.value || undefined,
                              })
                            }
                            placeholder="3-1-2-0"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`${adjunctId}-accessories`}>
                            Accessories
                          </Label>
                          <Input
                            id={`${adjunctId}-accessories`}
                            value={leadRow.accessories ?? ""}
                            onChange={(event) =>
                              onExerciseRowsChange(adjunctId, {
                                accessories: event.target.value || undefined,
                              })
                            }
                            placeholder="Band, pad, etc."
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`${adjunctId}-cues`}>Cues</Label>
                          <Input
                            id={`${adjunctId}-cues`}
                            value={leadRow.cues ?? ""}
                            onChange={(event) =>
                              onExerciseRowsChange(adjunctId, {
                                cues: event.target.value || undefined,
                              })
                            }
                            placeholder="Brace, soft knees..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="hidden grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
                        <span>#</span>
                        <span>{primaryLabel}</span>
                        <span>RPE</span>
                        <span>Lbs</span>
                      </div>

                      {adjunctRows.map((row) => {
                        const lastLogged = resolveLastLogged(
                          lastLoggedByExerciseId[row.exerciseId],
                          row.roundNumber
                        )

                        return (
                          <div
                            key={row.rowKey}
                            className="rounded-md border bg-muted/10 p-2"
                          >
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                              <div className="flex h-9 w-8 items-center justify-center rounded-full border bg-background text-xs font-medium tabular-nums">
                                {row.roundNumber}
                              </div>

                              <div className="min-w-0 space-y-2 sm:contents">
                                <div className="min-w-0">
                                  <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                                    {primaryLabel}
                                  </p>
                                  {row.prescriptionMode === "reps" ? (
                                    <NumericStepper
                                      id={`${row.rowKey}-reps`}
                                      label="Reps"
                                      hideLabel
                                      compact
                                      value={row.actualReps}
                                      onChange={(actualReps) =>
                                        onRowChange(row.rowKey, { actualReps })
                                      }
                                      parseInput={(raw) => parseLogIntInput(raw)}
                                      clampValue={(value) => clampLogInt(value)}
                                      lastHint={
                                        lastLogged?.actualReps != null
                                          ? String(lastLogged.actualReps)
                                          : null
                                      }
                                      readOnly={isReadOnly}
                                    />
                                  ) : row.prescriptionMode === "time" ? (
                                    <NumericStepper
                                      id={`${row.rowKey}-duration`}
                                      label="Duration (sec)"
                                      hideLabel
                                      compact
                                      value={row.actualDurationSeconds}
                                      onChange={(actualDurationSeconds) =>
                                        onRowChange(row.rowKey, {
                                          actualDurationSeconds,
                                        })
                                      }
                                      step={5}
                                      parseInput={(raw) => parseLogIntInput(raw)}
                                      clampValue={(value) => clampLogInt(value)}
                                      lastHint={
                                        lastLogged?.actualDurationSeconds != null
                                          ? String(
                                              lastLogged.actualDurationSeconds
                                            )
                                          : null
                                      }
                                      readOnly={isReadOnly}
                                    />
                                  ) : (
                                    <NumericStepper
                                      id={`${row.rowKey}-distance`}
                                      label="Distance (yds)"
                                      hideLabel
                                      compact
                                      value={row.actualDistance}
                                      onChange={(actualDistance) =>
                                        onRowChange(row.rowKey, {
                                          actualDistance,
                                        })
                                      }
                                      step={5}
                                      parseInput={(raw) => parseLogIntInput(raw)}
                                      clampValue={(value) => clampLogInt(value)}
                                      lastHint={
                                        lastLogged?.actualDistance != null
                                          ? String(lastLogged.actualDistance)
                                          : null
                                      }
                                      readOnly={isReadOnly}
                                    />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                                    RPE
                                  </p>
                                  <NumericStepper
                                    id={`${row.rowKey}-rpe`}
                                    label="RPE"
                                    hideLabel
                                    compact
                                    value={row.actualRpe}
                                    onChange={(actualRpe) =>
                                      onRowChange(row.rowKey, { actualRpe })
                                    }
                                    min={1}
                                    max={10}
                                    parseInput={(raw) =>
                                      parseLogIntInput(raw, {
                                        min: 1,
                                        max: 10,
                                      })
                                    }
                                    clampValue={(value) => clampLogRpe(value)}
                                    lastHint={
                                      lastLogged?.actualRpe != null
                                        ? String(lastLogged.actualRpe)
                                        : null
                                    }
                                    readOnly={isReadOnly}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:hidden">
                                    Lbs
                                  </p>
                                  <NumericStepper
                                    id={`${row.rowKey}-weight`}
                                    label="Weight (lbs)"
                                    hideLabel
                                    compact
                                    value={row.actualWeight}
                                    onChange={(actualWeight) =>
                                      onRowChange(row.rowKey, { actualWeight })
                                    }
                                    step={0.5}
                                    inputMode="decimal"
                                    formatDisplay={formatWeight}
                                    parseInput={parseWeightInput}
                                    clampValue={snapWeight}
                                    lastHint={
                                      lastLogged?.actualWeight != null
                                        ? formatWeight(lastLogged.actualWeight)
                                        : null
                                    }
                                    readOnly={isReadOnly}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : adjunctGroups.length > 0 ? (
          <div className="space-y-2">
            {adjunctGroups.map(({ adjunctId, rows: adjunctRows }) => {
              const leadRow = adjunctRows[0]!
              return (
                <div
                  key={adjunctId}
                  className="rounded-md border bg-background px-3 py-2"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <ExerciseVideoDialog
                      exerciseName={leadRow.exerciseName}
                      videoUrl={leadRow.videoUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{leadRow.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {adjunctRows.length} set
                        {adjunctRows.length === 1 ? "" : "s"} ·{" "}
                        {prescriptionModeLabels[leadRow.prescriptionMode]}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

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
