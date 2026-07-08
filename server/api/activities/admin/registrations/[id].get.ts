import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, registrations } from '../../../../database/schema'
import { activityCodeSchema } from '../../../../utils/activity-code'
import { db } from '../../../../utils/db'

const paramsSchema = z.object({
  id: z.string().regex(activityCodeSchema, '活动不存在'),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权：仅管理员可操作
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  // 2. 校验参数
  const params = await getValidatedRouterParams(event, paramsSchema.parse)
  const activity = db.select({ id: activities.id })
    .from(activities)
    .where(eq(activities.code, params.id))
    .get()
  if (!activity) {
    throw createError({ statusCode: 404, message: '活动不存在' })
  }

  // 3. 获取该活动的所有报名信息
  const registrationList = db.select({
    id: registrations.id,
    teamName: registrations.teamName,
    songName: registrations.songName,
    songDuration: registrations.songDuration,
    members: registrations.members,
    mobile: registrations.mobile,
    createdAt: registrations.createdAt,
    updatedAt: registrations.updatedAt,
  })
    .from(registrations)
    .where(eq(registrations.activityId, activity.id))
    .all()

  return { registrations: registrationList }
})
