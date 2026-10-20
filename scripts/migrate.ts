import "dotenv/config"

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL?.trim()

if (!databaseUrl) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle"
)

const pool = new Pool({ connectionString: databaseUrl })
const db = drizzle(pool)

console.log(`Applying migrations from ${migrationsFolder}...`)

try {
  await migrate(db, { migrationsFolder })
  console.log("Migrations complete")
} catch (error) {
  console.error("Migration failed:", error)
  process.exit(1)
} finally {
  await pool.end()
}
