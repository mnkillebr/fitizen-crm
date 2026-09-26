import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import {
  formatScannedAtInput,
  type InBodyFormFieldErrors,
} from "~/lib/inbody-form"
import type { InBodyScanSelect } from "../../models/inbody.server"

type InBodyScanFormProps = {
  defaultValues?: Partial<InBodyScanSelect>
  fieldErrors?: InBodyFormFieldErrors
  submitLabel?: string
  submitIntent?: string
  isSubmitting?: boolean
  cancelSlot?: React.ReactNode
}

export function InBodyScanForm({
  defaultValues,
  fieldErrors,
  submitLabel = "Save scan",
  submitIntent = "create-scan",
  isSubmitting = false,
  cancelSlot,
}: InBodyScanFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="scannedAt">Scan date</Label>
        <Input
          id="scannedAt"
          name="scannedAt"
          type="date"
          required
          defaultValue={
            defaultValues?.scannedAt
              ? formatScannedAtInput(defaultValues.scannedAt)
              : ""
          }
          aria-invalid={fieldErrors?.scannedAt ? true : undefined}
        />
        {fieldErrors?.scannedAt ? (
          <p className="text-xs text-destructive">{fieldErrors.scannedAt}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="weightLbs">Weight (lbs)</Label>
          <Input
            id="weightLbs"
            name="weightLbs"
            type="number"
            inputMode="decimal"
            step="0.1"
            required
            defaultValue={defaultValues?.weightLbs ?? ""}
            aria-invalid={fieldErrors?.weightLbs ? true : undefined}
          />
          {fieldErrors?.weightLbs ? (
            <p className="text-xs text-destructive">{fieldErrors.weightLbs}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skeletalMuscleMassLbs">Skeletal muscle mass (lbs)</Label>
          <Input
            id="skeletalMuscleMassLbs"
            name="skeletalMuscleMassLbs"
            type="number"
            inputMode="decimal"
            step="0.1"
            required
            defaultValue={defaultValues?.skeletalMuscleMassLbs ?? ""}
            aria-invalid={fieldErrors?.skeletalMuscleMassLbs ? true : undefined}
          />
          {fieldErrors?.skeletalMuscleMassLbs ? (
            <p className="text-xs text-destructive">
              {fieldErrors.skeletalMuscleMassLbs}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="percentBodyFat">Percent body fat (%)</Label>
          <Input
            id="percentBodyFat"
            name="percentBodyFat"
            type="number"
            inputMode="decimal"
            step="0.1"
            required
            defaultValue={defaultValues?.percentBodyFat ?? ""}
            aria-invalid={fieldErrors?.percentBodyFat ? true : undefined}
          />
          {fieldErrors?.percentBodyFat ? (
            <p className="text-xs text-destructive">{fieldErrors.percentBodyFat}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ecwRatio">ECW ratio</Label>
          <Input
            id="ecwRatio"
            name="ecwRatio"
            type="number"
            inputMode="decimal"
            step="0.001"
            required
            placeholder="0.380"
            defaultValue={defaultValues?.ecwRatio ?? ""}
            aria-invalid={fieldErrors?.ecwRatio ? true : undefined}
          />
          {fieldErrors?.ecwRatio ? (
            <p className="text-xs text-destructive">{fieldErrors.ecwRatio}</p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="basalMetabolicRate">Basal metabolic rate (kcal)</Label>
          <Input
            id="basalMetabolicRate"
            name="basalMetabolicRate"
            type="number"
            inputMode="decimal"
            step="1"
            required
            defaultValue={defaultValues?.basalMetabolicRate ?? ""}
            aria-invalid={fieldErrors?.basalMetabolicRate ? true : undefined}
          />
          {fieldErrors?.basalMetabolicRate ? (
            <p className="text-xs text-destructive">
              {fieldErrors.basalMetabolicRate}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Context for this scan…"
          aria-invalid={fieldErrors?.notes ? true : undefined}
        />
        {fieldErrors?.notes ? (
          <p className="text-xs text-destructive">{fieldErrors.notes}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="intent"
          value={submitIntent}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        {cancelSlot}
      </div>
    </div>
  )
}
