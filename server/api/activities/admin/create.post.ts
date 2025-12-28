import { z } from 'zod'
import { activities, activitySeats } from '../../../database/schema'
import { db } from '../../../utils/db'

const createActivitySchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  maxParticipants: z.number().int().min(1, '参与人数必须大于0'),
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
    throw createError({ statusCode: 400, message: validation.error.issues[0].message })
  }
  const data = validation.data

  // 3. 事务创建活动及座位
  const newActivity = db.transaction((tx) => {
    // 3.1 创建活动
    const activity = tx.insert(activities).values({
      ...data,
      creatorId: user.id,
    }).returning().get()

    // 3.2 批量创建座位
    const seatsToInsert = Array.from({ length: data.maxParticipants }, (_, i) => ({
      activityId: activity.id,
      seatNumber: i + 1,
    }))

    tx.insert(activitySeats).values(seatsToInsert).run()

    return activity
  })

  return { activity: newActivity }
})
