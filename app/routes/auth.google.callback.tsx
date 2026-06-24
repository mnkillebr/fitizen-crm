import { redirect } from "react-router"

import type { Route } from "./+types/auth.google.callback"
import {
  exchangeGoogleAuthCode,
  verifyGoogleOAuthState,
} from "~/lib/google-oauth.server"

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return redirect("/sign-in?error=google_denied")
  }

  if (!code || !state) {
    return redirect("/sign-in?error=google_invalid")
  }

  const role = verifyGoogleOAuthState(state)

  if (!role) {
    return redirect("/sign-in?error=google_invalid_state")
  }

  try {
    const authResult = await exchangeGoogleAuthCode(code, role)

    // Session cookies will be created in a follow-up task.
    void authResult

    return redirect("/")
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Google OAuth callback failed:", error)
    }

    return redirect(`/sign-in?role=${role}&error=google_failed`)
  }
}

export default function GoogleAuthCallback() {
  return null
}
