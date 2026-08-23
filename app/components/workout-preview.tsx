import { Badge } from "~/components/ui/badge"
import {
  prescriptionModeLabels,
  workoutBlockTypeLabels,
} from "~/lib/workout-builder"

type PreviewExercise = {
  id: string
  prescriptionMode: "reps" | "time"
  targetReps: number | null
  targetDurationSeconds: number | null
  targetRpe: number | null
  targetWeight: number | null
  tempo: string | null
  cue1: string | null
  cue2: string | null
  cue3: string | null
  exercise: { name: string }
}

type PreviewBlock = {
  id: string
  name: string | null
  blockType: keyof typeof workoutBlockTypeLabels
  rounds: number | null
  notes: string | null
  exercises: PreviewExercise[]
}

type WorkoutPreviewSource = {
  notes: string | null
  blocks: PreviewBlock[]
}

function formatTarget(
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
    parts.push(`${targetWeight} lbs`)
  }

  return parts.length ? parts.join(" · ") : "—"
}

type WorkoutPreviewProps = {
  workout: WorkoutPreviewSource
}

export function WorkoutPreview({ workout }: WorkoutPreviewProps) {
  return (
    <div className="space-y-4">
      {workout.notes ? (
        <p className="text-sm text-muted-foreground">{workout.notes}</p>
      ) : null}

      {workout.blocks.map((block) => (
        <div key={block.id} className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="font-medium">{block.name ?? "Workout block"}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {workoutBlockTypeLabels[block.blockType]}
              </Badge>
              {block.rounds ? (
                <Badge variant="outline">{block.rounds} rounds</Badge>
              ) : null}
            </div>
            {block.notes ? (
              <p className="mt-2 text-sm text-muted-foreground">{block.notes}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            {block.exercises.map((exercise) => (
              <div key={exercise.id} className="rounded-md border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{exercise.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {prescriptionModeLabels[exercise.prescriptionMode]} ·{" "}
                      {formatTarget(
                        exercise.prescriptionMode,
                        exercise.targetReps,
                        exercise.targetDurationSeconds,
                        exercise.targetRpe,
                        exercise.targetWeight
                      )}
                    </p>
                  </div>
                  {exercise.tempo ? (
                    <Badge variant="outline">Tempo {exercise.tempo}</Badge>
                  ) : null}
                </div>

                {[exercise.cue1, exercise.cue2, exercise.cue3].filter(Boolean).length ? (
                  <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                    {[exercise.cue1, exercise.cue2, exercise.cue3]
                      .filter(Boolean)
                      .map((cue) => (
                        <li key={cue}>{cue}</li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
