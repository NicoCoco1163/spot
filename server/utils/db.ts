import process from 'node:process'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from '../database/schema'

const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db', {
  create: true,
  readwrite: true,
})

sqlite.exec('PRAGMA foreign_keys = ON')

export const db = drizzle({ client: sqlite, schema })
