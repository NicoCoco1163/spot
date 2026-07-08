import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { db } from '../../../utils/db'

const swapSeatSchema = z.object({
  activityCode: z.string().regex(activityCodeSchema, '活动不存在'),
  fromSeatNumber: z.number().int(),
  toSeatNumber: z.number().int(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  const body = await readBody(event)
  const validation = swapSeatSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }

  const { activityCode, fromSeatNumber, toSeatNumber } = validation.data
  if (fromSeatNumber === toSeatNumber) {
    throw createError({ statusCode: 400, message: '请选择两个不同的位次' })
  }

  const result = db.transaction((tx) => {
    const activity = tx.select().from(activities).where(eq(activities.code, activityCode)).get()
    if (!activity) {
      throw createError({ statusCode: 404, message: '活动不存在' })
    }
    const activityId = activity.id
    if (activity.status === 'cancelled' || activity.status === 'completed') {
      throw createError({ statusCode: 400, message: '活动已结束或已取消，无法换位' })
    }

    const fromSeat = tx.select()
      .from(activitySeats)
      .where(and(
        eq(activitySeats.activityId, activityId),
        eq(activitySeats.seatNumber, fromSeatNumber),
      ))
      .get()

    const toSeat = tx.select()
      .from(activitySeats)
      .where(and(
        eq(activitySeats.activityId, activityId),
        eq(activitySeats.seatNumber, toSeatNumber),
      ))
      .get()

    if (!fromSeat || !toSeat) {
      throw createError({ statusCode: 404, message: '位次不存在' })
    }
    if (!fromSeat.mobile || !toSeat.mobile) {
      throw createError({ statusCode: 400, message: '仅支持两个已占用位次交换' })
    }

    tx.update(activitySeats)
      .set({
        mobile: null,
        registrationId: null,
        remark: null,
        occupiedAt: null,
      })
      .where(eq(activitySeats.id, fromSeat.id))
      .run()

    tx.update(activitySeats)
      .set({
        mobile: fromSeat.mobile,
        registrationId: fromSeat.registrationId,
        remark: fromSeat.remark,
        occupiedAt: fromSeat.occupiedAt,
      })
      .where(eq(activitySeats.id, toSeat.id))
      .run()

    tx.update(activitySeats)
      .set({
        mobile: toSeat.mobile,
        registrationId: toSeat.registrationId,
        remark: toSeat.remark,
        occupiedAt: toSeat.occupiedAt,
      })
      .where(eq(activitySeats.id, fromSeat.id))
      .run()

    return {
      fromSeatNumber,
      toSeatNumber,
    }
  })

  return {
    success: true,
    swapped: result,
  }
})
