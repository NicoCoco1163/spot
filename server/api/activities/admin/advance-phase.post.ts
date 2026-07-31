import { and, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats, registrations } from '../../../database/schema'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'

const advancePhaseSchema = z.object({
  code: z.string(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  const body = await readBody(event)
  const validation = advancePhaseSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }

  const { code } = validation.data
  const currentActivity = db.select()
    .from(activities)
    .where(and(eq(activities.code, code), eq(activities.creatorId, user.id)))
    .get()

  if (!currentActivity) {
    throw createError({ statusCode: 404, message: '活动不存在或无权操作' })
  }

  if (currentActivity.status === 'cancelled' || currentActivity.status === 'completed') {
    throw createError({ statusCode: 400, message: '当前活动状态不支持切换阶段' })
  }

  if (getActivityPhase(currentActivity) !== 'registration') {
    throw createError({ statusCode: 400, message: '当前活动已在占位阶段' })
  }

  const registrationCountResult = db.select({ count: count() })
    .from(registrations)
    .where(eq(registrations.activityId, currentActivity.id))
    .get()
  const registrationCount = registrationCountResult?.count || 0

  const updatedActivity = db.transaction((tx) => {
    const activity = tx.update(activities)
      .set({
        deadline: new Date(Date.now() - 1000),
        updatedAt: new Date(),
      })
      .where(eq(activities.id, currentActivity.id))
      .returning()
      .get()

    if (!activity) {
      throw createError({ statusCode: 500, message: '切换阶段失败' })
    }

    const existingSeatsCount = tx.select({ count: count() })
      .from(activitySeats)
      .where(eq(activitySeats.activityId, currentActivity.id))
      .get()

    if ((!existingSeatsCount?.count || existingSeatsCount.count === 0) && registrationCount > 0) {
      const seatsToInsert = Array.from({ length: registrationCount }, (_, i) => ({
        activityId: currentActivity.id,
        seatNumber: i + 1,
      }))
      tx.insert(activitySeats).values(seatsToInsert).run()
    }

    return activity
  })

  return { activity: updatedActivity }
})
