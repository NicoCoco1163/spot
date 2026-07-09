import process from 'node:process'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'

const databaseUrl = process.env.DATABASE_URL || 'sqlite.db'
const sqlite = new Database(databaseUrl, {
  create: true,
  readwrite: true,
})

sqlite.exec('PRAGMA foreign_keys = ON')

const db = drizzle(sqlite)

migrate(db, {
  migrationsFolder: './server/database/migrations',
})

const foreignKeyViolations = sqlite
  .query('PRAGMA foreign_key_check')
  .all()

if (foreignKeyViolations.length > 0) {
  console.error('Foreign key violations found after migration:')
  console.error(foreignKeyViolations)
  process.exit(1)
}

console.log(`Database migrated: ${databaseUrl}`)
