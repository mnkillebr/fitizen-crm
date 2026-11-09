import { ArrowLeftIcon, BowlFoodIcon } from "@phosphor-icons/react"
import {
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router"

import type { Route } from "./+types/coach.client.$clientId.nutrition"
import { NutritionCalculator } from "~/components/nutrition-calculator"
import { Button } from "~/components/ui/button"
import { requireApprovedCoach } from "~/lib/auth.server"
import {
  getNutritionFormFieldErrors,
  parseNutritionFormData,
  type NutritionFormFieldErrors,
} from "~/lib/nutrition-form"
import { calculateTdee } from "~/lib/tdee"
import {
  getCoachClientNutritionContext,
  upsertMemberNutritionTarget,
} from "../../../models/nutrition.server"

type ActionData =
  | {
      ok: false
      fieldErrors: NutritionFormFieldErrors
    }
  | null

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireApprovedCoach(request)
  const context = await getCoachClientNutritionContext(
    user.id,
    params.clientId
  )

  if (!context) {
    throw new Response("Client not found", { status: 404 })
  }

  return context
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireApprovedCoach(request)
  const context = await getCoachClientNutritionContext(
    user.id,
    params.clientId
  )

  if (!context) {
    throw new Response("Client not found", { status: 404 })
  }

  const formData = await request.formData()
  const parsed = parseNutritionFormData(formData)

  if (!parsed.success) {
    return {
      ok: false as const,
      fieldErrors: getNutritionFormFieldErrors(parsed.error),
    } satisfies ActionData
  }

  const result = calculateTdee({
    age: parsed.data.age,
    sex: parsed.data.sex,
    heightInches: parsed.data.totalHeightInches,
    weightLbs: parsed.data.weightLbs,
    activityLevel: parsed.data.activityLevel,
    goal: parsed.data.goal,
    macros: parsed.data.macros,
  })

  await upsertMemberNutritionTarget(params.clientId, {
    age: parsed.data.age,
    sex: parsed.data.sex,
    heightInches: parsed.data.totalHeightInches,
    weightLbs: parsed.data.weightLbs,
    activityLevel: parsed.data.activityLevel,
    goal: parsed.data.goal,
    ...result,
  })

  return null
}

export default function CoachClientNutrition() {
  const { client, prefill, target } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4" asChild>
          <Link to={`/dashboard/coach/client/${client.id}`}>
            <ArrowLeftIcon />
            Back to client
          </Link>
        </Button>

        <div className="flex items-start gap-3">
          <BowlFoodIcon className="mt-1 size-6 text-primary" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Nutrition</h1>
            <p className="mt-2 text-muted-foreground">
              Calculate TDEE and macro targets for {client.name}.
            </p>
          </div>
        </div>
      </div>

      <NutritionCalculator
        key={target?.updatedAt?.toString() ?? "new"}
        target={target}
        prefill={prefill}
        fieldErrors={
          actionData && !actionData.ok ? actionData.fieldErrors : undefined
        }
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
