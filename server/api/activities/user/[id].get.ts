import { and, asc, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats, registrations, users } from '../../../database/schema'
import { getActivityPhase } from '../../../utils/activity-phase'
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

  // 4. 判断当前阶段
  const phase = getActivityPhase(activity)

  // 5. 获取报名数量
  const registrationCountResult = db.select({ count: count() })
    .from(registrations)
    .where(eq(registrations.activityId, activityId))
    .get()
  const registrationCount = registrationCountResult?.count || 0

  // 6. 如果是抢座阶段，检查是否需要懒加载创建座位
  if (phase === 'booking') {
    const existingSeatsCount = db.select({ count: count() })
      .from(activitySeats)
      .where(eq(activitySeats.activityId, activityId))
      .get()

    // 如果座位不存在，根据报名人数创建座位
    if (!existingSeatsCount?.count || existingSeatsCount.count === 0) {
      if (registrationCount > 0) {
        const seatsToInsert = Array.from({ length: registrationCount }, (_, i) => ({
          activityId,
          seatNumber: i + 1,
        }))
        db.insert(activitySeats).values(seatsToInsert).run()
      }
    }
  }

  // 7. 获取座位详情（包含占用者的信息）
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
    registration: {
      song: registrations.song,
      captain: registrations.captain,
      members: registrations.members,
      createdAt: registrations.createdAt,
    },
  })
    .from(activitySeats)
    .leftJoin(users, eq(activitySeats.userId, users.id))
    .leftJoin(registrations, eq(activitySeats.registrationId, registrations.id))
    .where(eq(activitySeats.activityId, activityId))
    .orderBy(asc(activitySeats.seatNumber))
    .all()

  // 整理数据结构：如果是未被占用的座位，user 字段应为 null
  const formattedSeats = seats.map(seat => ({
    ...seat,
    isOccupied: !!seat.isOccupied, // 转为 boolean
    user: seat.isOccupied ? seat.user : null,
    registration: seat.isOccupied ? seat.registration : null,
  }))

  // 8. 获取当前用户的报名信息
  const myRegistration = db.select()
    .from(registrations)
    .where(and(
      eq(registrations.activityId, activityId),
      eq(registrations.userId, user.id),
    ))
    .get()

  return {
    activity,
    seats: formattedSeats,
    phase,
    registrationCount,
    myRegistration,
  }
})
