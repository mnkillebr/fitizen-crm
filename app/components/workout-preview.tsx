import { ExerciseVideoDialog } from "~/components/exercise-video-dialog"
import { Badge } from "~/components/ui/badge"
import {
  prescriptionModeLabels,
  workoutBlockTypeLabels,
} from "~/lib/workout-builder"

type PreviewExercise = {
  id: string
  prescriptionMode: "reps" | "time" | "distance"
  targetReps: number | null
  targetDurationSeconds: number | null
  targetDistance: number | null
  targetRpe: number | null
  targetWeight: number | null
  tempo: string | null
  cues: string | null
  accessories: string | null
  exercise: { name: string; videoUrl?: string | null }
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
    parts.push(`${targetWeight} lbs`)
  }

  return parts.length ? parts.join(" · ") : "—"
}

function ExercisePreviewCard({
  exercise,
  rounds,
}: {
  exercise: PreviewExercise
  rounds?: number | null
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-start gap-3">
        <ExerciseVideoDialog
          exerciseName={exercise.exercise.name}
          videoUrl={exercise.exercise.videoUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{exercise.exercise.name}</p>
              <p className="text-xs text-muted-foreground">
                {prescriptionModeLabels[exercise.prescriptionMode]} ·{" "}
                {formatTarget(
                  exercise.prescriptionMode,
                  exercise.targetReps,
                  exercise.targetDurationSeconds,
                  exercise.targetDistance,
                  exercise.targetRpe,
                  exercise.targetWeight
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rounds ? (
                <Badge variant="outline">{rounds} rounds</Badge>
              ) : null}
              {exercise.tempo ? (
                <Badge variant="outline">Tempo {exercise.tempo}</Badge>
              ) : null}
            </div>
          </div>

          {exercise.accessories ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Accessories: {exercise.accessories}
            </p>
          ) : null}

          {exercise.cues ? (
            <p className="mt-1 text-xs text-muted-foreground">{exercise.cues}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

type WorkoutPreviewProps = {
  workout: WorkoutPreviewSource
}

export function WorkoutPreview({ workout }: WorkoutPreviewProps) {
  const isStraightSetProtocol =
    workout.blocks.length > 0 &&
    workout.blocks.every((block) => block.blockType === "straight_set")

  return (
    <div className="space-y-4">
      {workout.notes ? (
        <p className="text-sm text-muted-foreground">{workout.notes}</p>
      ) : null}

      {isStraightSetProtocol ? (
        <div className="space-y-2">
          {workout.blocks.map((block) => {
            const exercise = block.exercises[0]
            if (!exercise) return null

            return (
              <ExercisePreviewCard
                key={block.id}
                exercise={exercise}
                rounds={block.rounds}
              />
            )
          })}
        </div>
      ) : (
        workout.blocks.map((block) => (
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
                <ExercisePreviewCard key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
