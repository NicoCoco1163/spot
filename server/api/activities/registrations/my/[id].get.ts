import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { registrations } from '../../../../database/schema'
import { db } from '../../../../utils/db'

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

  // 3. 获取当前用户在该活动的报名信息
  const registration = db.select()
    .from(registrations)
    .where(and(
      eq(registrations.activityId, activityId),
      eq(registrations.userId, user.id),
    ))
    .get()

  return { registration }
})