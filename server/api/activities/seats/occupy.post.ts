import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats } from '../../../database/schema'
import { db } from '../../../utils/db'

const occupySeatSchema = z.object({
  activityId: z.number().int(),
  seatNumber: z.number().int(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  // 2. 校验参数
  const body = await readBody(event)
  const validation = occupySeatSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.issues[0].message })
  }
  const { activityId, seatNumber, remark } = validation.data

  // 3. 事务操作：抢占座位
  const result = db.transaction((tx) => {
    // 3.1 检查活动状态
    const activity = tx.select().from(activities).where(eq(activities.id, activityId)).get()
    if (!activity) {
      throw createError({ statusCode: 404, message: '活动不存在' })
    }
    if (activity.status !== 'published') {
      throw createError({ statusCode: 400, message: '活动未开始或已结束' })
    }

    // 3.2 检查用户是否已在该活动中占位 (可选规则：每人每活动限占一坑)
    const existingSeat = tx.select()
      .from(activitySeats)
      .where(and(eq(activitySeats.activityId, activityId), eq(activitySeats.userId, user.id)))
      .get()

    if (existingSeat) {
      throw createError({ statusCode: 400, message: `您已占用了 ${existingSeat.seatNumber} 号座位，请先释放` })
    }

    // 3.3 尝试抢占
    // 使用 update ... where userId is null 来实现乐观锁效果
    const updatedSeat = tx.update(activitySeats)
      .set({
        userId: user.id,
        remark: remark || null,
        occupiedAt: new Date(),
      })
      .where(and(
        eq(activitySeats.activityId, activityId),
        eq(activitySeats.seatNumber, seatNumber),
        isNull(activitySeats.userId), // 关键：确保座位未被占用
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
