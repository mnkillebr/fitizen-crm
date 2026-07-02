import type { ExerciseSelect } from "../../models/exercise.server"
import {
  exerciseEquipmentLabels,
  exerciseEquipmentValues,
  exerciseMuscleGroupLabels,
  exerciseMuscleGroupValues,
  exercisePlaneOfMotionLabels,
  exercisePlaneOfMotionValues,
  exerciseSupportLabels,
  exerciseSupportValues,
  type ExerciseFormFieldErrors,
} from "~/lib/exercise-form"
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
import { Textarea } from "~/components/ui/textarea"

type ExerciseFormFieldsProps = {
  defaultValues?: Partial<
    Pick<
      ExerciseSelect,
      "name" | "description" | "planeOfMotion" | "support" | "equipment" | "muscleGroup"
    >
  >
  fieldErrors?: ExerciseFormFieldErrors
}

export function ExerciseFormFields({
  defaultValues,
  fieldErrors,
}: ExerciseFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          placeholder="Barbell bench press"
          required
          aria-invalid={fieldErrors?.name ? true : undefined}
        />
        {fieldErrors?.name ? (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

        <div className="space-y-2">
          <Label htmlFor="muscleGroup">Muscle group</Label>
          <Select
            name="muscleGroup"
            defaultValue={defaultValues?.muscleGroup ?? ""}
            required
            aria-invalid={fieldErrors?.muscleGroup ? true : undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select muscle group" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Select muscle group</SelectLabel>
                {exerciseMuscleGroupValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exerciseMuscleGroupLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldErrors?.muscleGroup ? (
            <p className="text-xs text-destructive">{fieldErrors.muscleGroup}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="planeOfMotion">Plane of motion</Label>
          <Select
            name="planeOfMotion"
            defaultValue={defaultValues?.planeOfMotion ?? ""}
            required
            aria-invalid={fieldErrors?.planeOfMotion ? true : undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select plane" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Select plane</SelectLabel>
                {exercisePlaneOfMotionValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exercisePlaneOfMotionLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldErrors?.planeOfMotion ? (
            <p className="text-xs text-destructive">{fieldErrors.planeOfMotion}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="support">Support</Label>
          <Select
            name="support"
            defaultValue={defaultValues?.support ?? ""}
            required
            aria-invalid={fieldErrors?.support ? true : undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select support" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Select support</SelectLabel>
                {exerciseSupportValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exerciseSupportLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldErrors?.support ? (
            <p className="text-xs text-destructive">{fieldErrors.support}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="equipment">Equipment</Label>
          <Select
            name="equipment"
            defaultValue={defaultValues?.equipment ?? ""}
            required
            aria-invalid={fieldErrors?.equipment ? true : undefined}
          >
            <SelectTrigger className="w-full mb-0">
              <SelectValue placeholder="Select equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Select equipment</SelectLabel>
                {exerciseEquipmentValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {exerciseEquipmentLabels[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldErrors?.equipment ? (
            <p className="text-xs text-destructive">{fieldErrors.equipment}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Setup, execution cues, or equipment notes..."
          className={cn(
            "w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-2 text-sm transition-colors outline-none",
            "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            "dark:bg-input/30"
          )}
        />
      </div>
    </>
  )
}
