import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { activities, activitySeats } from '../../../database/schema'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  // 1. 鉴权：仅管理员可操作
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  const query = getQuery(event)
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50)
  const offset = (page - 1) * limit
  const status = typeof query.status === 'string' && query.status !== 'all' ? query.status : null
  const phaseFilter = typeof query.phase === 'string' && query.phase !== 'all' ? query.phase : null
  const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : ''

  const conditions = [
    eq(activities.creatorId, user.id),
    status ? eq(activities.status, status) : undefined,
    keyword
      ? or(
          like(activities.title, `%${keyword}%`),
          like(activities.description, `%${keyword}%`),
        )
      : undefined,
  ].filter(Boolean)

  // 2. 查询该管理员创建的活动，并带上报名/占位计数
  const result = db
    .select({
      code: activities.code,
      title: activities.title,
      description: activities.description,
      deadline: activities.deadline,
      status: activities.status,
      createdAt: activities.createdAt,
      updatedAt: activities.updatedAt,
      registrationCount: sql<number>`(SELECT COUNT(*) FROM registrations WHERE registrations.activity_id = activities.id)`,
      occupiedCount: sql<number>`count(case when ${activitySeats.mobile} is not null then 1 end)`,
    })
    .from(activities)
    .leftJoin(activitySeats, eq(activities.id, activitySeats.activityId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(activities.id)
    .orderBy(desc(activities.createdAt))
    .all()

  const activitiesWithPhase = result
    .map((item) => {
      const activityData = {
        ...item,
        seatCapacity: item.registrationCount || 0,
      }
      return {
        ...activityData,
        phase: getActivityPhase(activityData as any),
      }
    })
    .filter(item => !phaseFilter || item.phase === phaseFilter)

  const pagedActivities = activitiesWithPhase.slice(offset, offset + limit)
  const total = activitiesWithPhase.length

  return {
    activities: pagedActivities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasMore: offset + pagedActivities.length < total,
    },
  }
})
