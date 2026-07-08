import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createError } from 'h3'
import { activities } from '../database/schema'
import { db } from './db'

export const activityCodeSchema = /^[a-z0-9]{8,16}$/

export function createActivityCode() {
  return randomBytes(5).toString('hex')
}

export function createUniqueActivityCode() {
  for (let i = 0; i < 10; i++) {
    const code = createActivityCode()
    const exists = db.select({ id: activities.id })
      .from(activities)
      .where(eq(activities.code, code))
      .get()

    if (!exists)
      return code
  }

  throw createError({ statusCode: 500, message: '生成活动码失败' })
}

export function getActivityByCode(code: string) {
  return db.select()
    .from(activities)
    .where(eq(activities.code, code))
    .get()
}
