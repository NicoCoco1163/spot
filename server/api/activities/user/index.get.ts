import { desc, eq, sql } from 'drizzle-orm'
import { activities, activitySeats, registrations } from '../../../database/schema'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.isAdmin) {
    throw createError({ statusCode: 403, message: '游客只能访问活动详情页' })
  }

  // 1. 查询条件
  const whereConditions = undefined // 保留旧接口兼容管理员调试，游客不再可访问

  // 分页参数
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const offset = (page - 1) * limit

  // 2. 查询活动
  // 关联查询：计算报名人数和已占座位数
  const result = db.select({
    code: activities.code,
    title: activities.title,
    description: activities.description,
    deadline: activities.deadline,
    status: activities.status,
    registrationCount: sql<number>`(SELECT COUNT(*) FROM registrations WHERE registrations.activity_id = activities.id)`,
    occupiedCount: sql<number>`count(case when ${activitySeats.mobile} is not null then 1 end)`,
  })
    .from(activities)
    .leftJoin(activitySeats, eq(activities.id, activitySeats.activityId))
    .where(whereConditions)
    .groupBy(activities.id)
    .orderBy(desc(activities.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  // 3. 添加阶段判断
  const activitiesWithPhase = result.map((item) => {
    const activityData = {
      ...item,
      seatCapacity: item.registrationCount || 0, // 座位数 = 报名人数
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
