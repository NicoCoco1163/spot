import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats, users } from '../../../database/schema'
import { db } from '../../../utils/db'

const paramsSchema = z.object({
  id: z.coerce.number().int(),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  // 2. 校验参数
  const params = await getValidatedRouterParams(event, paramsSchema.parse)
  const activityId = params.id

  // 3. 获取活动详情
  const activity = db.select().from(activities).where(eq(activities.id, activityId)).get()

  if (!activity) {
    throw createError({ statusCode: 404, message: '活动不存在' })
  }

  // 4. 获取座位详情（包含占用者的信息）
  const seats = db.select({
    id: activitySeats.id,
    seatNumber: activitySeats.seatNumber,
    isOccupied: activitySeats.userId,
    remark: activitySeats.remark,
    occupiedAt: activitySeats.occupiedAt,
    user: {
      id: users.id,
      nickname: users.nickname,
      mobile: users.mobile, // 可根据隐私需求决定是否返回手机号
    },
  })
    .from(activitySeats)
    .leftJoin(users, eq(activitySeats.userId, users.id))
    .where(eq(activitySeats.activityId, activityId))
    .orderBy(asc(activitySeats.seatNumber))
    .all()

  // 整理数据结构：如果是未被占用的座位，user 字段应为 null
  const formattedSeats = seats.map(seat => ({
    ...seat,
    isOccupied: !!seat.isOccupied, // 转为 boolean
    user: seat.isOccupied ? seat.user : null,
  }))

  return {
    activity,
    seats: formattedSeats,
  }
})
