import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { OAuth2Client } from "google-auth-library"

import { signInRoleSchema, type SignInRole } from "~/lib/sign-in"

const STATE_TTL_MS = 10 * 60 * 1000
const OAUTH_SCOPES = ["openid", "email", "profile"]

type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export type OAuthStatePayload = {
  role: SignInRole
  exp: number
  nonce: string
  inviteId?: string
}

export type GoogleUserProfile = {
  id: string
  email: string
  name: string
  picture: string
  verifiedEmail: boolean
}

export type GoogleAuthResult = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  profile: GoogleUserProfile
  role: SignInRole
}

function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  const appUrl = (process.env.APP_URL ?? "http://localhost:5173").trim()

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured")
  }

  return {
    clientId,
    clientSecret,
    redirectUri: new URL("/auth/google/callback", appUrl).toString(),
  }
}

function createGoogleOAuthClient(): OAuth2Client {
  const config = getGoogleOAuthConfig()

  return new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  })
}

function getStateSecret(): string {
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()

  if (!secret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_SECRET is not configured")
  }

  return secret
}

function encodeStatePayload(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

function decodeStatePayload(encoded: string): OAuthStatePayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8")
    const parsed = JSON.parse(json) as OAuthStatePayload

    if (!signInRoleSchema.safeParse(parsed.role).success) {
      return null
    }

    if (typeof parsed.exp !== "number" || typeof parsed.nonce !== "string") {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function signStatePayload(encodedPayload: string): string {
  return createHmac("sha256", getStateSecret())
    .update(encodedPayload)
    .digest("base64url")
}

function getGoogleOAuthErrorDetail(error: Error): string {
  const response = (
    error as {
      response?: {
        data?: {
          error?: string
          error_description?: string
        }
      }
    }
  ).response

  return (
    response?.data?.error_description ??
    response?.data?.error ??
    error.message
  )
}

function formatGoogleOAuthError(error: unknown): Error {
  if (error instanceof Error) {
    return new Error(`Google OAuth error: ${getGoogleOAuthErrorDetail(error)}`)
  }

  return new Error("Google OAuth error: unknown failure")
}

export function createGoogleOAuthState(
  role: SignInRole,
  inviteId?: string
): string {
  const payload: OAuthStatePayload = {
    role,
    exp: Date.now() + STATE_TTL_MS,
    nonce: randomUUID(),
    ...(inviteId ? { inviteId } : {}),
  }
  const encoded = encodeStatePayload(payload)

  return `${encoded}.${signStatePayload(encoded)}`
}

export function verifyGoogleOAuthState(
  state: string
): OAuthStatePayload | null {
  const [encoded, signature] = state.split(".")

  if (!encoded || !signature) {
    return null
  }

  const expectedSignature = signStatePayload(encoded)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  const payload = decodeStatePayload(encoded)

  if (!payload || payload.exp < Date.now()) {
    return null
  }

  return payload
}

export function getGoogleAuthorizationUrl(state: string): string {
  const client = createGoogleOAuthClient()

  return client.generateAuthUrl({
    access_type: "offline",
    scope: OAUTH_SCOPES,
    state,
    prompt: "consent",
    include_granted_scopes: true,
  })
}

export async function exchangeGoogleAuthCode(
  code: string,
  role: SignInRole
): Promise<GoogleAuthResult> {
  const config = getGoogleOAuthConfig()
  const client = createGoogleOAuthClient()

  try {
    const { tokens } = await client.getToken({
      code,
      redirect_uri: config.redirectUri,
    })

    client.setCredentials(tokens)

    if (!tokens.id_token) {
      throw new Error("Google did not return an ID token")
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.clientId,
    })
    const payload = ticket.getPayload()

    if (!payload?.sub || !payload.email) {
      throw new Error("Google ID token is missing required claims")
    }

    return {
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ?? Date.now(),
      profile: {
        id: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        picture: payload.picture ?? "",
        verifiedEmail: payload.email_verified ?? false,
      },
      role,
    }
  } catch (error) {
    throw formatGoogleOAuthError(error)
  }
}
