import { redirect } from "react-router"

import type { Route } from "./+types/logout"
import { destroySession, getSession } from "~/lib/sessions"

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("cookie"))

  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  })
}

export async function loader() {
  return redirect("/")
}

export default function Logout() {
  return null
}
