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
    route("coach/client/:clientId", "routes/dashboard/coach.client.$clientId.tsx"),
    route("coach/exercises/new", "routes/dashboard/coach.exercises.new.tsx"),
    route("coach/exercises/:exerciseId/edit", "routes/dashboard/coach.exercises.$exerciseId.edit.tsx"),
    route("coach/exercises", "routes/dashboard/coach.exercises.tsx"),
    route("coach", "routes/dashboard/coach.tsx"),
    route("member", "routes/dashboard/member.tsx"),
  ]),
] satisfies RouteConfig
