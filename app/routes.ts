import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("sign-in", "routes/sign-in.tsx"),
  route("setup-profile", "routes/setup-profile.tsx"),
  route("pending-approval", "routes/pending-approval.tsx"),
  route("invite/:token", "routes/invite.$token.tsx"),
  route("auth/google/callback", "routes/auth.google.callback.tsx"),
  route("logout", "routes/logout.tsx"),
  route("dashboard", "routes/dashboard/layout.tsx", [
    index("routes/dashboard/index.tsx"),
    route("coach/clients", "routes/dashboard/coach.clients.tsx"),
    route("coach/client/:clientId/workouts/history", "routes/dashboard/coach.client.$clientId.workouts.history.tsx"),
    route("coach/client/:clientId/workout/:workoutId/log", "routes/dashboard/coach.client.$clientId.workout.$workoutId.log.tsx"),
    route("coach/client/:clientId/workout-log/:logId", "routes/dashboard/coach.client.$clientId.workout-log.$logId.tsx"),
    route("coach/client/:clientId", "routes/dashboard/coach.client.$clientId.tsx"),
    route("exercises/new", "routes/dashboard/coach.exercises.new.tsx"),
    route("exercises/:exerciseId/edit", "routes/dashboard/coach.exercises.$exerciseId.edit.tsx"),
    route("exercises", "routes/dashboard/coach.exercises.tsx"),
    route("workouts/new", "routes/dashboard/coach.workouts.new.tsx"),
    route("workouts/:templateId/edit", "routes/dashboard/coach.workouts.$templateId.edit.tsx"),
    route("workouts", "routes/dashboard/coach.workouts.tsx"),
    route("coach", "routes/dashboard/coach.tsx"),
    route("member", "routes/dashboard/member.tsx"),
  ]),
] satisfies RouteConfig
