import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { db } from '../../../utils/db'
import { mainlandMobilePattern, normalizeMobile } from '../../../utils/mobile'

const releaseSeatSchema = z.object({
  activityCode: z.string().regex(activityCodeSchema, '活动不存在'),
  seatNumber: z.number().int(),
  mobile: z.string().transform(normalizeMobile).pipe(z.string().regex(mainlandMobilePattern, '请输入有效的中国大陆手机号')),
})

export default defineEventHandler(async (event) => {
  // 1. 校验参数
  const body = await readBody(event)
  const validation = releaseSeatSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }
  const { activityCode, seatNumber, mobile } = validation.data
  const activity = db.select({ id: activities.id })
    .from(activities)
    .where(eq(activities.code, activityCode))
    .get()
  if (!activity) {
    throw createError({ statusCode: 404, message: '活动不存在' })
  }

  // 2. 释放位次
  const releasedSeat = db.update(activitySeats)
    .set({
      mobile: null,
      remark: null,
      registrationId: null,
      occupiedAt: null,
    })
    .where(and(
      eq(activitySeats.activityId, activity.id),
      eq(activitySeats.seatNumber, seatNumber),
      eq(activitySeats.mobile, mobile), // 关键：只能释放自己的位次
    ))
    .returning()
    .get()

  if (!releasedSeat) {
    throw createError({ statusCode: 400, message: '释放失败：您未占用该位次或位次不存在' })
  }

  return { success: true }
})
