import { z } from 'zod'
import { activities } from '../../../database/schema'
import { db } from '../../../utils/db'

const createActivitySchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  registrationDeadline: z.coerce.date(), // 报名截止时间，必填
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

  // 3. 校验截止时间必须早于开始时间
  if (data.registrationDeadline >= data.startTime) {
    throw createError({ statusCode: 400, message: '报名截止时间必须早于活动开始时间' })
  }

  // 4. 创建活动（不创建座位，座位在截止后懒加载创建）
  const newActivity = db.insert(activities).values({
    ...data,
    creatorId: user.id,
  }).returning().get()

  return { activity: newActivity }
})
