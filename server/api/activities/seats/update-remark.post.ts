import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { db } from '../../../utils/db'
import { mainlandMobilePattern, normalizeMobile } from '../../../utils/mobile'

const updateRemarkSchema = z.object({
  activityCode: z.string().regex(activityCodeSchema, '活动不存在'),
  seatNumber: z.number().int(),
  mobile: z.string().transform(normalizeMobile).pipe(z.string().regex(mainlandMobilePattern, '请输入有效的中国大陆手机号')),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validation = updateRemarkSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({
      statusCode: 400,
      message: firstError?.message || '参数错误',
    })
  }
  const { activityCode, seatNumber, mobile, remark } = validation.data
  const activity = db.select({ id: activities.id })
    .from(activities)
    .where(eq(activities.code, activityCode))
    .get()
  if (!activity) {
    throw createError({ statusCode: 404, message: '活动不存在' })
  }

  // 验证是否是该手机号的位次
  const seat = db.select().from(activitySeats).where(
    and(
      eq(activitySeats.activityId, activity.id),
      eq(activitySeats.seatNumber, seatNumber),
      eq(activitySeats.mobile, mobile),
    ),
  ).get()

  if (!seat) {
    throw createError({
      statusCode: 403,
      message: '您没有权限修改该位次',
    })
  }

  // 更新备注
  db.update(activitySeats)
    .set({ remark: remark || '' })
    .where(eq(activitySeats.id, seat.id))
    .run()

  return { success: true }
})
