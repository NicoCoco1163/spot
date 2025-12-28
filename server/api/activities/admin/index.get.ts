import { desc, eq } from 'drizzle-orm'
import { activities } from '../../../database/schema'
import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  // 1. 鉴权：仅管理员可操作
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  // 2. 查询该管理员创建的活动
  const result = await db
    .select()
    .from(activities)
    .where(eq(activities.creatorId, user.id))
    .orderBy(desc(activities.createdAt))
    .all()

  return { activities: result }
})
