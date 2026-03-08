import { desc, eq, sql } from 'drizzle-orm'
import { activities, activitySeats, registrations } from '../../../database/schema'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  // 2. 查询条件
  const whereConditions = user.isAdmin
    ? undefined // 管理员查看所有
    : eq(activities.status, 'published') // 普通用户仅看已发布

  // 分页参数
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const offset = (page - 1) * limit

  // 3. 查询活动
  // 关联查询：计算报名人数和已占座位数
  const result = db.select({
    id: activities.id,
    title: activities.title,
    description: activities.description,
    startTime: activities.startTime,
    endTime: activities.endTime,
    registrationDeadline: activities.registrationDeadline,
    maxParticipants: activities.maxParticipants,
    status: activities.status,
    registrationCount: sql<number>`(SELECT COUNT(*) FROM registrations WHERE registrations.activity_id = activities.id)`,
    occupiedCount: sql<number>`count(case when ${activitySeats.userId} is not null then 1 end)`,
  })
    .from(activities)
    .leftJoin(activitySeats, eq(activities.id, activitySeats.activityId))
    .where(whereConditions)
    .groupBy(activities.id)
    .orderBy(desc(activities.startTime))
    .limit(limit)
    .offset(offset)
    .all()

  // 4. 添加阶段判断
  const activitiesWithPhase = result.map((item) => {
    const activityData = {
      ...item,
      maxParticipants: item.registrationCount || 0, // 座位数 = 报名人数
    }
    const phase = getActivityPhase(activityData as any)
    return {
      ...activityData,
      phase,
    }
  })

  // 获取总数 (简化的总数查询，不带关联)
  const totalResult = db.select({ count: sql<number>`count(*)` })
    .from(activities)
    .where(whereConditions)
    .get()

  const total = totalResult?.count || 0

  return {
    activities: activitiesWithPhase,
    pagination: {
      page,
      limit,
      total,
      hasMore: offset + result.length < total,
    },
  }
})
