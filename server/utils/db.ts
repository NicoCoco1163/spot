import process from 'node:process'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../database/schema'

// 数据库文件存储在项目根目录
const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db')

export const db = drizzle(sqlite, { schema })
