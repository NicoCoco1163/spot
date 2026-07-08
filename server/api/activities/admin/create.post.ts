import { z } from 'zod'
import { activities } from '../../../database/schema'
import { createUniqueActivityCode } from '../../../utils/activity-code'
import { db } from '../../../utils/db'

const createActivitySchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional(),
  deadline: z.coerce.date(),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权：仅管理员可操作
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  // 2. 校验参数
  const body = await readBody(event)
  const validation = createActivitySchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }
  const data = validation.data

  // 3. 创建活动（不创建位次，位次在报名截止后懒加载创建）
  const newActivity = db.insert(activities).values({
    ...data,
    code: createUniqueActivityCode(),
    creatorId: user.id,
  }).returning().get()

  return { activity: newActivity }
})
