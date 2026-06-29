import "dotenv/config"

import db from "../db"
import { User } from "../db/schema"

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const arg = process.argv.find((value) => value.startsWith(prefix))
  return arg?.slice(prefix.length)
}

async function main() {
  const email = getArg("email")
  const firstName = getArg("firstName") ?? "Admin"
  const lastName = getArg("lastName") ?? "User"

  if (!email) {
    console.error(
      "Usage: npx tsx scripts/seed-admin.ts --email=admin@example.com [--firstName=Admin] [--lastName=User]"
    )
    process.exit(1)
  }

  const now = new Date()

  const created = await db
    .insert(User)
    .values({
      email,
      firstName,
      lastName,
      role: "coach",
      updatedAt: now,
      approvedCoach: true,
      admin: true,
    })
    .returning()

  const admin = created[0]

  console.log("Admin user created:")
  console.log(`  id: ${admin.id}`)
  console.log(`  email: ${admin.email}`)
  console.log("")
  console.log(
    "This user can create coach invites with scripts/create-coach-invite.ts"
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
