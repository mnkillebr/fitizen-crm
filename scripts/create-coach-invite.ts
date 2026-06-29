import "dotenv/config"

import { eq } from "drizzle-orm"

import db from "../db"
import { User } from "../db/schema"
import { createInvite } from "../models/invite.server"

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const arg = process.argv.find((value) => value.startsWith(prefix))
  return arg?.slice(prefix.length)
}

function getAppUrl() {
  return (process.env.APP_URL ?? "http://localhost:5173").replace(/\/$/, "")
}

async function main() {
  const adminEmail = getArg("adminEmail")
  const coachEmail = getArg("email")
  const expiryDays = Number(getArg("expiryDays") ?? "7")

  if (!adminEmail || !coachEmail) {
    console.error(
      "Usage: npx tsx scripts/create-coach-invite.ts --adminEmail=admin@example.com --email=coach@example.com [--expiryDays=7]"
    )
    process.exit(1)
  }

  const admins = await db
    .select()
    .from(User)
    .where(eq(User.email, adminEmail))

  const admin = admins[0]

  if (!admin?.admin) {
    console.error(`No admin user found for email: ${adminEmail}`)
    process.exit(1)
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  const inviteData = await createInvite({
    role: "coach",
    createdById: admin.id,
    email: coachEmail,
    expiresAt,
  })

  const invite = inviteData[0]
  const inviteUrl = `${getAppUrl()}/invite/${invite.token}`

  console.log("Coach invite created:")
  console.log(`  email: ${coachEmail}`)
  console.log(`  expires: ${invite.expiresAt.toISOString()}`)
  console.log(`  url: ${inviteUrl}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
