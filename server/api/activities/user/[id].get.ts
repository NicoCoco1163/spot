import { and, asc, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats, registrations } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'
import { isMainlandMobile, normalizeMobile } from '../../../utils/mobile'

const paramsSchema = z.object({
  id: z.string().regex(activityCodeSchema, '活动不存在'),
})

export default defineEventHandler(async (event) => {
  // 1. 校验参数
  const params = await getValidatedRouterParams(event, paramsSchema.parse)
  const query = getQuery(event)
  const mobile = typeof query.mobile === 'string' && isMainlandMobile(query.mobile)
    ? normalizeMobile(query.mobile)
    : null
  const activityCode = params.id

  // 2. 获取活动详情
  const activity = db.select().from(activities).where(eq(activities.code, activityCode)).get()

  if (!activity) {
    throw createError({ statusCode: 404, message: '活动不存在' })
  }
  const activityId = activity.id
  const publicActivity = {
    code: activity.code,
    title: activity.title,
    description: activity.description,
    deadline: activity.deadline,
    status: activity.status,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  }

  // 3. 判断当前阶段
  const phase = getActivityPhase(activity)

  // 4. 获取报名数量
  const registrationCountResult = db.select({ count: count() })
    .from(registrations)
    .where(eq(registrations.activityId, activityId))
    .get()
  const registrationCount = registrationCountResult?.count || 0

  // 5. 如果是占位阶段，检查是否需要懒加载创建位次
  if (phase === 'booking') {
    const existingSeatsCount = db.select({ count: count() })
      .from(activitySeats)
      .where(eq(activitySeats.activityId, activityId))
      .get()

    // 如果位次不存在，根据报名人数创建位次
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

  // 6. 获取位次详情（包含报名信息）
  const seats = db.select({
    id: activitySeats.id,
    seatNumber: activitySeats.seatNumber,
    isOccupied: activitySeats.mobile,
    mobile: activitySeats.mobile,
    remark: activitySeats.remark,
    occupiedAt: activitySeats.occupiedAt,
    registration: {
      teamName: registrations.teamName,
      songName: registrations.songName,
      songDuration: registrations.songDuration,
      members: registrations.members,
      createdAt: registrations.createdAt,
    },
  })
    .from(activitySeats)
    .leftJoin(registrations, eq(activitySeats.registrationId, registrations.id))
    .where(eq(activitySeats.activityId, activityId))
    .orderBy(asc(activitySeats.seatNumber))
    .all()

  // 整理数据结构：如果是未被占用的座位，user 字段应为 null
  const isAdmin = !!event.context.user?.isAdmin
  const formattedSeats = seats.map(seat => ({
    ...seat,
    isOccupied: !!seat.isOccupied, // 转为 boolean
    mobile: isAdmin || seat.mobile === mobile ? seat.mobile : null,
    registration: seat.isOccupied ? seat.registration : null,
  }))

  // 7. 获取当前手机号的报名信息
  const myRegistration = mobile
    ? db.select({
        id: registrations.id,
        activityId: registrations.activityId,
        mobile: registrations.mobile,
        teamName: registrations.teamName,
        songName: registrations.songName,
        songDuration: registrations.songDuration,
        members: registrations.members,
        createdAt: registrations.createdAt,
        updatedAt: registrations.updatedAt,
      })
        .from(registrations)
        .where(and(
          eq(registrations.activityId, activityId),
          eq(registrations.mobile, mobile),
        ))
        .get()
    : null
  const mySeat = mobile
    ? formattedSeats.find(seat => seat.mobile === mobile) || null
    : null

  // 公开报名列表不返回手机号，供游客查看活动报名情况。
  const publicRegistrations = db.select({
    id: registrations.id,
    teamName: registrations.teamName,
    songName: registrations.songName,
    songDuration: registrations.songDuration,
    members: registrations.members,
    createdAt: registrations.createdAt,
    updatedAt: registrations.updatedAt,
  })
    .from(registrations)
    .where(eq(registrations.activityId, activityId))
    .orderBy(asc(registrations.createdAt))
    .all()

  return {
    activity: publicActivity,
    seats: formattedSeats,
    phase,
    registrationCount,
    myRegistration,
    mySeat,
    publicRegistrations,
  }
})
