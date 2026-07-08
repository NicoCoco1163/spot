import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities } from '../../../database/schema'
import { db } from '../../../utils/db'

const updateActivitySchema = z.object({
  code: z.string(),
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional(),
  deadline: z.coerce.date(),
  status: z.enum(['published', 'cancelled', 'completed']).optional(),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  // 2. 校验
  const body = await readBody(event)
  const validation = updateActivitySchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }
  const { code, ...updateData } = validation.data

  // 3. 检查权限并获取当前数据
  const currentActivity = db.select()
    .from(activities)
    .where(and(eq(activities.code, code), eq(activities.creatorId, user.id)))
    .get()

  if (!currentActivity) {
    throw createError({ statusCode: 404, message: '活动不存在或无权修改' })
  }

  // 4. 更新活动
  const updatedActivity = db.update(activities)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(activities.id, currentActivity.id))
    .returning()
    .get()

  if (!updatedActivity) {
    throw createError({ statusCode: 500, message: '更新失败' })
  }

  return { activity: updatedActivity }
})
