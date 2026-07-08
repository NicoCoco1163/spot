import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, registrations } from '../../../../database/schema'
import { activityCodeSchema } from '../../../../utils/activity-code'
import { db } from '../../../../utils/db'
import { isMainlandMobile, normalizeMobile } from '../../../../utils/mobile'

const paramsSchema = z.object({
  id: z.string().regex(activityCodeSchema, '活动不存在'),
})

export default defineEventHandler(async (event) => {
  // 1. 校验参数
  const params = await getValidatedRouterParams(event, paramsSchema.parse)
  const query = getQuery(event)
  const mobile = typeof query.mobile === 'string' ? normalizeMobile(query.mobile) : ''
  if (!isMainlandMobile(mobile)) {
    throw createError({ statusCode: 400, message: '请输入有效的中国大陆手机号' })
  }
  const activity = db.select({ id: activities.id })
    .from(activities)
    .where(eq(activities.code, params.id))
    .get()
  if (!activity) {
    throw createError({ statusCode: 404, message: '活动不存在' })
  }

  // 2. 获取当前手机号在该活动的报名信息
  const registration = db.select()
    .from(registrations)
    .where(and(
      eq(registrations.activityId, activity.id),
      eq(registrations.mobile, mobile),
    ))
    .get()

  return { registration }
})
