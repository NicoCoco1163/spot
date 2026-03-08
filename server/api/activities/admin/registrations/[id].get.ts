import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { registrations, users } from '../../../../database/schema'
import { db } from '../../../../utils/db'

const paramsSchema = z.object({
  id: z.coerce.number().int(),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权：仅管理员可操作
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  // 2. 校验参数
  const params = await getValidatedRouterParams(event, paramsSchema.parse)
  const activityId = params.id

  // 3. 获取该活动的所有报名信息
  const registrationList = db.select({
    id: registrations.id,
    song: registrations.song,
    captain: registrations.captain,
    members: registrations.members,
    createdAt: registrations.createdAt,
    updatedAt: registrations.updatedAt,
    user: {
      id: users.id,
      nickname: users.nickname,
      mobile: users.mobile,
    },
  })
    .from(registrations)
    .leftJoin(users, eq(registrations.userId, users.id))
    .where(eq(registrations.activityId, activityId))
    .all()

  return { registrations: registrationList }
})