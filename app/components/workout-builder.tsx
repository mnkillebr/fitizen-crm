import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Form } from "react-router"
import { useMemo, useState } from "react"

import { ExercisePicker } from "~/components/exercise-picker"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
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
import { cn } from "~/lib/utils"
import {
  blockTypeForStyle,
  defaultBlockName,
  prescriptionModeLabels,
  type BuilderBlockExercisePayload,
  type BuilderBlockPayload,
  type PrescriptionModeValue,
  type WorkoutBlockTypeValue,
  type WorkoutBuilderFieldErrors,
  type WorkoutBuilderPayload,
  type WorkoutStyleValue,
  workoutBlockTypeLabels,
  workoutStyleLabels,
  workoutStyleValues,
} from "~/lib/workout-builder"
import type { ExerciseSelect } from "../../models/exercise.server"
import type { WorkoutTemplateWithDetails } from "../../models/workout-template.server"

type BuilderExerciseState = BuilderBlockExercisePayload & {
  clientId: string
  exerciseName: string
}

type BuilderBlockState = Omit<BuilderBlockPayload, "exercises"> & {
  clientId: string
  exercises: BuilderExerciseState[]
}

type BuilderState = {
  title: string
  style: WorkoutStyleValue
  notes: string
  blocks: BuilderBlockState[]
}

type WorkoutBuilderProps = {
  exercises: ExerciseSelect[]
  defaultTemplate?: WorkoutTemplateWithDetails
  fieldErrors?: WorkoutBuilderFieldErrors
  submitLabel: string
  isSubmitting?: boolean
}

function createClientId() {
  return crypto.randomUUID()
}

function createEmptyBlock(style: WorkoutStyleValue, orderIndex: number): BuilderBlockState {
  const blockType = blockTypeForStyle(style)

  return {
    clientId: createClientId(),
    blockType,
    orderIndex,
    name: defaultBlockName(style, orderIndex),
    rounds: blockType === "circuit" ? 3 : undefined,
    restBetweenRoundsSeconds: blockType === "circuit" ? 60 : undefined,
    workDurationSeconds: blockType === "interval" ? 40 : undefined,
    restDurationSeconds: blockType === "interval" ? 20 : undefined,
    targetDurationSeconds: blockType === "segment" ? 1800 : undefined,
    targetIntensity: blockType === "segment" ? "Zone 2" : undefined,
    notes: undefined,
    exercises: [],
  }
}

function createInitialState(defaultTemplate?: WorkoutTemplateWithDetails): BuilderState {
  if (defaultTemplate) {
    return {
      title: defaultTemplate.title,
      style: defaultTemplate.style,
      notes: defaultTemplate.notes ?? "",
      blocks: defaultTemplate.blocks.map((block) => ({
        clientId: createClientId(),
        blockType: block.blockType,
        orderIndex: block.orderIndex,
        name: block.name ?? defaultBlockName(defaultTemplate.style, block.orderIndex),
        rounds: block.rounds ?? undefined,
        restBetweenRoundsSeconds: block.restBetweenRoundsSeconds ?? undefined,
        workDurationSeconds: block.workDurationSeconds ?? undefined,
        restDurationSeconds: block.restDurationSeconds ?? undefined,
        targetDurationSeconds: block.targetDurationSeconds ?? undefined,
        targetIntensity: block.targetIntensity ?? undefined,
        notes: block.notes ?? undefined,
        exercises: block.exercises.map((exercise) => ({
          clientId: createClientId(),
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exercise.name,
          orderIndex: exercise.orderIndex,
          prescriptionMode: exercise.prescriptionMode,
          targetReps: exercise.targetReps ?? undefined,
          targetDurationSeconds: exercise.targetDurationSeconds ?? undefined,
          targetRpe: exercise.targetRpe ?? undefined,
          targetWeight: exercise.targetWeight ?? undefined,
          tempo: exercise.tempo ?? undefined,
          cue1: exercise.cue1 ?? undefined,
          cue2: exercise.cue2 ?? undefined,
          cue3: exercise.cue3 ?? undefined,
          restAfterSeconds: exercise.restAfterSeconds ?? undefined,
        })),
      })),
    }
  }

  return {
    title: "",
    style: "strength_circuit",
    notes: "",
    blocks: [createEmptyBlock("strength_circuit", 0)],
  }
}

function serializeState(state: BuilderState): WorkoutBuilderPayload {
  return {
    title: state.title,
    style: state.style,
    notes: state.notes || undefined,
    blocks: state.blocks.map((block, blockIndex) => ({
      blockType: block.blockType,
      orderIndex: blockIndex,
      name: block.name || undefined,
      rounds: block.rounds,
      restBetweenRoundsSeconds: block.restBetweenRoundsSeconds,
      workDurationSeconds: block.workDurationSeconds,
      restDurationSeconds: block.restDurationSeconds,
      targetDurationSeconds: block.targetDurationSeconds,
      targetIntensity: block.targetIntensity || undefined,
      notes: block.notes || undefined,
      exercises: block.exercises.map((exercise, exerciseIndex) => ({
        exerciseId: exercise.exerciseId,
        orderIndex: exerciseIndex,
        prescriptionMode: exercise.prescriptionMode,
        targetReps: exercise.targetReps,
        targetDurationSeconds: exercise.targetDurationSeconds,
        targetRpe: exercise.targetRpe,
        targetWeight: exercise.targetWeight,
        tempo: exercise.tempo || undefined,
        cue1: exercise.cue1 || undefined,
        cue2: exercise.cue2 || undefined,
        cue3: exercise.cue3 || undefined,
        restAfterSeconds: exercise.restAfterSeconds,
      })),
    })),
  }
}

function reindexBlocks(blocks: BuilderBlockState[]) {
  return blocks.map((block, index) => ({
    ...block,
    orderIndex: index,
  }))
}

function reindexExercises(exercises: BuilderExerciseState[]) {
  return exercises.map((exercise, index) => ({
    ...exercise,
    orderIndex: index,
  }))
}

function BlockSettings({
  block,
  onChange,
}: {
  block: BuilderBlockState
  onChange: (updates: Partial<BuilderBlockState>) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Block name</Label>
        <Input
          value={block.name ?? ""}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Block name"
        />
      </div>

      {block.blockType === "circuit" ? (
        <>
          <div className="space-y-1.5">
            <Label>Rounds</Label>
            <Input
              type="number"
              min={1}
              value={block.rounds ?? ""}
              onChange={(event) =>
                onChange({
                  rounds: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rest between rounds (sec)</Label>
            <Input
              type="number"
              min={0}
              value={block.restBetweenRoundsSeconds ?? ""}
              onChange={(event) =>
                onChange({
                  restBetweenRoundsSeconds: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            />
          </div>
        </>
      ) : null}

      {block.blockType === "interval" ? (
        <>
          <div className="space-y-1.5">
            <Label>Work (sec)</Label>
            <Input
              type="number"
              min={1}
              value={block.workDurationSeconds ?? ""}
              onChange={(event) =>
                onChange({
                  workDurationSeconds: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rest (sec)</Label>
            <Input
              type="number"
              min={0}
              value={block.restDurationSeconds ?? ""}
              onChange={(event) =>
                onChange({
                  restDurationSeconds: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rounds</Label>
            <Input
              type="number"
              min={1}
              value={block.rounds ?? ""}
              onChange={(event) =>
                onChange({
                  rounds: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            />
          </div>
        </>
      ) : null}

      {block.blockType === "segment" ? (
        <>
          <div className="space-y-1.5">
            <Label>Duration (sec)</Label>
            <Input
              type="number"
              min={1}
              value={block.targetDurationSeconds ?? ""}
              onChange={(event) =>
                onChange({
                  targetDurationSeconds: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Intensity</Label>
            <Input
              value={block.targetIntensity ?? ""}
              onChange={(event) => onChange({ targetIntensity: event.target.value })}
              placeholder="Zone 2, moderate, etc."
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

function ExercisePrescriptionRow({
  exercise,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
}: {
  exercise: BuilderExerciseState
  onChange: (updates: Partial<BuilderExerciseState>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  disableMoveUp: boolean
  disableMoveDown: boolean
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{exercise.exerciseName}</p>
          <Badge variant="secondary" className="mt-1 text-[0.625rem]">
            {prescriptionModeLabels[exercise.prescriptionMode]}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disableMoveUp}
            onClick={onMoveUp}
            aria-label="Move exercise up"
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disableMoveDown}
            onClick={onMoveDown}
            aria-label="Move exercise down"
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label="Remove exercise"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Mode</Label>
          <Select
            value={exercise.prescriptionMode}
            onValueChange={(value) =>
              onChange({
                prescriptionMode: value as PrescriptionModeValue,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="reps">Reps</SelectItem>
                <SelectItem value="time">Time</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {exercise.prescriptionMode === "reps" ? (
          <div className="space-y-1.5">
            <Label>Target reps</Label>
            <Input
              type="number"
              min={1}
              value={exercise.targetReps ?? ""}
              onChange={(event) =>
                onChange({
                  targetReps: event.target.value ? Number(event.target.value) : undefined,
                })
              }
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Duration (sec)</Label>
            <Input
              type="number"
              min={1}
              value={exercise.targetDurationSeconds ?? ""}
              onChange={(event) =>
                onChange({
                  targetDurationSeconds: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Target RPE</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={exercise.targetRpe ?? ""}
            onChange={(event) =>
              onChange({
                targetRpe: event.target.value ? Number(event.target.value) : undefined,
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
            value={exercise.targetWeight ?? ""}
            onChange={(event) =>
              onChange({
                targetWeight: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tempo</Label>
          <Input
            value={exercise.tempo ?? ""}
            onChange={(event) => onChange({ tempo: event.target.value })}
            placeholder="3-1-2-0"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Rest after (sec)</Label>
          <Input
            type="number"
            min={0}
            value={exercise.restAfterSeconds ?? ""}
            onChange={(event) =>
              onChange({
                restAfterSeconds: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Cue 1</Label>
          <Input
            value={exercise.cue1 ?? ""}
            onChange={(event) => onChange({ cue1: event.target.value })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Cue 2</Label>
          <Input
            value={exercise.cue2 ?? ""}
            onChange={(event) => onChange({ cue2: event.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

export function WorkoutBuilder({
  exercises,
  defaultTemplate,
  fieldErrors,
  submitLabel,
  isSubmitting = false,
}: WorkoutBuilderProps) {
  const [state, setState] = useState<BuilderState>(() =>
    createInitialState(defaultTemplate)
  )
  const [activePickerBlockId, setActivePickerBlockId] = useState<string | null>(
    state.blocks[0]?.clientId ?? null
  )

  const payloadJson = useMemo(() => JSON.stringify(serializeState(state)), [state])

  function updateBlock(blockId: string, updates: Partial<BuilderBlockState>) {
    setState((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.clientId === blockId ? { ...block, ...updates } : block
      ),
    }))
  }

  function addBlock() {
    setState((current) => {
      const nextBlocks = reindexBlocks([
        ...current.blocks,
        createEmptyBlock(current.style, current.blocks.length),
      ])
      const newBlock = nextBlocks[nextBlocks.length - 1]
      setActivePickerBlockId(newBlock.clientId)
      return { ...current, blocks: nextBlocks }
    })
  }

  function removeBlock(blockId: string) {
    setState((current) => {
      const nextBlocks = reindexBlocks(
        current.blocks.filter((block) => block.clientId !== blockId)
      )
      if (activePickerBlockId === blockId) {
        setActivePickerBlockId(nextBlocks[0]?.clientId ?? null)
      }
      return {
        ...current,
        blocks: nextBlocks.length ? nextBlocks : [createEmptyBlock(current.style, 0)],
      }
    })
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    setState((current) => {
      const index = current.blocks.findIndex((block) => block.clientId === blockId)
      if (index === -1) return current

      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.blocks.length) return current

      const nextBlocks = [...current.blocks]
      const [moved] = nextBlocks.splice(index, 1)
      nextBlocks.splice(targetIndex, 0, moved)

      return { ...current, blocks: reindexBlocks(nextBlocks) }
    })
  }

  function addExerciseToBlock(blockId: string, exercise: ExerciseSelect) {
    setState((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.clientId !== blockId) return block

        const nextExercise: BuilderExerciseState = {
          clientId: createClientId(),
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          orderIndex: block.exercises.length,
          prescriptionMode: "reps",
          targetReps: 10,
          targetRpe: 7,
          restAfterSeconds: 60,
        }

        return {
          ...block,
          exercises: reindexExercises([...block.exercises, nextExercise]),
        }
      }),
    }))
  }

  function updateExercise(
    blockId: string,
    exerciseClientId: string,
    updates: Partial<BuilderExerciseState>
  ) {
    setState((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.clientId !== blockId) return block

        return {
          ...block,
          exercises: block.exercises.map((exercise) =>
            exercise.clientId === exerciseClientId
              ? { ...exercise, ...updates }
              : exercise
          ),
        }
      }),
    }))
  }

  function removeExercise(blockId: string, exerciseClientId: string) {
    setState((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.clientId !== blockId) return block

        return {
          ...block,
          exercises: reindexExercises(
            block.exercises.filter((exercise) => exercise.clientId !== exerciseClientId)
          ),
        }
      }),
    }))
  }

  function moveExercise(
    blockId: string,
    exerciseClientId: string,
    direction: "up" | "down"
  ) {
    setState((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.clientId !== blockId) return block

        const index = block.exercises.findIndex(
          (exercise) => exercise.clientId === exerciseClientId
        )
        if (index === -1) return block

        const targetIndex = direction === "up" ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= block.exercises.length) return block

        const nextExercises = [...block.exercises]
        const [moved] = nextExercises.splice(index, 1)
        nextExercises.splice(targetIndex, 0, moved)

        return {
          ...block,
          exercises: reindexExercises(nextExercises),
        }
      }),
    }))
  }

  function handleStyleChange(style: WorkoutStyleValue) {
    setState((current) => ({
      ...current,
      style,
      blocks: current.blocks.map((block, index) => ({
        ...createEmptyBlock(style, index),
        clientId: block.clientId,
        name: block.name ?? defaultBlockName(style, index),
        exercises: block.exercises,
      })),
    }))
  }

  return (
    <Form method="post" className="space-y-6">
      <input type="hidden" name="payload" value={payloadJson} readOnly />

      {fieldErrors?.formError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {fieldErrors.formError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workout details</CardTitle>
          <CardDescription>
            Choose a style and name your workout template.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="workout-title">Title</Label>
            <Input
              id="workout-title"
              value={state.title}
              onChange={(event) =>
                setState((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Upper body strength A"
              aria-invalid={fieldErrors?.title ? true : undefined}
            />
            {fieldErrors?.title ? (
              <p className="text-xs text-destructive">{fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-style">Style</Label>
            <Select
              value={state.style}
              onValueChange={(value) => handleStyleChange(value as WorkoutStyleValue)}
            >
              <SelectTrigger id="workout-style" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {workoutStyleValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {workoutStyleLabels[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="workout-notes">Notes (optional)</Label>
            <textarea
              id="workout-notes"
              rows={3}
              value={state.notes}
              onChange={(event) =>
                setState((current) => ({ ...current, notes: event.target.value }))
              }
              className={cn(
                "w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-2 text-sm transition-colors outline-none",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                "dark:bg-input/30"
              )}
              placeholder="Session focus, warm-up notes, etc."
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Blocks</h2>
            <p className="text-sm text-muted-foreground">
              Add blocks and populate them with exercises from your catalog.
            </p>
            {fieldErrors?.blocks ? (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.blocks}</p>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={addBlock}>
            <PlusIcon />
            Add block
          </Button>
        </div>

        {state.blocks.map((block, blockIndex) => (
          <Card key={block.clientId}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    {block.name || defaultBlockName(state.style, blockIndex)}
                  </CardTitle>
                  <CardDescription>
                    {workoutBlockTypeLabels[block.blockType as WorkoutBlockTypeValue]}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={blockIndex === 0}
                    onClick={() => moveBlock(block.clientId, "up")}
                    aria-label="Move block up"
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={blockIndex === state.blocks.length - 1}
                    onClick={() => moveBlock(block.clientId, "down")}
                    aria-label="Move block down"
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeBlock(block.clientId)}
                    aria-label="Remove block"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <BlockSettings
                block={block}
                onChange={(updates) => updateBlock(block.clientId, updates)}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Exercises</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={activePickerBlockId === block.clientId ? "default" : "outline"}
                    onClick={() =>
                      setActivePickerBlockId(
                        activePickerBlockId === block.clientId ? null : block.clientId
                      )
                    }
                  >
                    <PlusIcon />
                    {activePickerBlockId === block.clientId ? "Hide picker" : "Add exercise"}
                  </Button>
                </div>

                {block.exercises.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No exercises in this block yet.
                  </div>
                ) : (
                  block.exercises.map((exercise, exerciseIndex) => (
                    <ExercisePrescriptionRow
                      key={exercise.clientId}
                      exercise={exercise}
                      onChange={(updates) =>
                        updateExercise(block.clientId, exercise.clientId, updates)
                      }
                      onRemove={() => removeExercise(block.clientId, exercise.clientId)}
                      onMoveUp={() =>
                        moveExercise(block.clientId, exercise.clientId, "up")
                      }
                      onMoveDown={() =>
                        moveExercise(block.clientId, exercise.clientId, "down")
                      }
                      disableMoveUp={exerciseIndex === 0}
                      disableMoveDown={exerciseIndex === block.exercises.length - 1}
                    />
                  ))
                )}
              </div>

              {activePickerBlockId === block.clientId ? (
                <ExercisePicker
                  exercises={exercises}
                  onSelect={(exercise) => addExerciseToBlock(block.clientId, exercise)}
                  excludeExerciseIds={block.exercises.map((item) => item.exerciseId)}
                />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </Form>
  )
}
