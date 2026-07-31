import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats, registrations } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { canOccupySeat } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'
import { mainlandMobilePattern, normalizeMobile } from '../../../utils/mobile'

const occupySeatSchema = z.object({
  activityCode: z.string().regex(activityCodeSchema, '活动不存在'),
  seatNumber: z.number().int(),
  mobile: z.string().transform(normalizeMobile).pipe(z.string().regex(mainlandMobilePattern, '请输入有效的中国大陆手机号')),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  // 1. 校验参数
  const body = await readBody(event)
  const validation = occupySeatSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }
  const { activityCode, seatNumber, mobile, remark } = validation.data

  // 2. 事务操作：抢占座位
  const result = db.transaction((tx) => {
    // 2.1 检查活动状态
    const activity = tx.select().from(activities).where(eq(activities.code, activityCode)).get()
    if (!activity) {
      throw createError({ statusCode: 404, message: '活动不存在' })
    }
    const activityId = activity.id
    if (activity.status !== 'published') {
      throw createError({ statusCode: 400, message: '活动未开始或已结束' })
    }

    // 2.2 检查是否在占位阶段
    if (!canOccupySeat(activity)) {
      throw createError({ statusCode: 400, message: '当前不在占位阶段' })
    }

    // 2.3 检查手机号是否已报名
    const registration = tx.select()
      .from(registrations)
      .where(and(
        eq(registrations.activityId, activityId),
        eq(registrations.mobile, mobile),
      ))
      .get()

    if (!registration) {
      throw createError({ statusCode: 400, message: '您尚未报名该活动，无法占位' })
    }
    if (!registration.teamName?.trim() || !registration.songName?.trim()) {
      throw createError({ statusCode: 400, message: '请先补齐队伍名称和歌曲名称后再占位' })
    }

    // 2.4 检查手机号是否已在该活动中占位
    const existingSeat = tx.select()
      .from(activitySeats)
      .where(and(eq(activitySeats.activityId, activityId), eq(activitySeats.mobile, mobile)))
      .get()

    if (existingSeat) {
      throw createError({ statusCode: 400, message: `您已占用了 ${existingSeat.seatNumber} 号位次，请先释放` })
    }

    // 2.5 尝试抢占
    // 使用 update ... where mobile is null 来实现乐观锁效果
    const updatedSeat = tx.update(activitySeats)
      .set({
        mobile,
        registrationId: registration.id,
        remark: remark || null,
        occupiedAt: new Date(),
      })
      .where(and(
        eq(activitySeats.activityId, activityId),
        eq(activitySeats.seatNumber, seatNumber),
        isNull(activitySeats.mobile), // 关键：确保座位未被占用
      ))
      .returning()
      .get()

    if (!updatedSeat) {
      throw createError({ statusCode: 409, message: '手慢了，该位置已被抢占' })
    }

    return updatedSeat
  })

  return { seat: result }
})
