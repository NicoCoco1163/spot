import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activitySeats } from '../../../database/schema'
import { db } from '../../../utils/db'

const releaseSeatSchema = z.object({
  activityId: z.number().int(),
  seatNumber: z.number().int(),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  // 2. 校验参数
  const body = await readBody(event)
  const validation = releaseSeatSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.issues[0].message })
  }
  const { activityId, seatNumber } = validation.data

  // 3. 释放座位
  const releasedSeat = db.update(activitySeats)
    .set({
      userId: null,
      remark: null,
      occupiedAt: null,
    })
    .where(and(
      eq(activitySeats.activityId, activityId),
      eq(activitySeats.seatNumber, seatNumber),
      eq(activitySeats.userId, user.id), // 关键：只能释放自己的座位
    ))
    .returning()
    .get()

  if (!releasedSeat) {
    throw createError({ statusCode: 400, message: '释放失败：您未占用该座位或座位不存在' })
  }

  return { success: true }
})
