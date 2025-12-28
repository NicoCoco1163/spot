import { and, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats } from '../../../database/schema'
import { db } from '../../../utils/db'

const updateActivitySchema = z.object({
  id: z.number().int(),
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  maxParticipants: z.number().int().min(1, '参与人数必须大于0').optional(),
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
    throw createError({ statusCode: 400, message: validation.error.issues[0].message })
  }
  const { id, ...updateData } = validation.data

  // 3. 事务处理
  const result = db.transaction((tx) => {
    // 3.1 检查权限并获取当前数据
    const currentActivity = tx.select()
      .from(activities)
      .where(and(eq(activities.id, id), eq(activities.creatorId, user.id)))
      .get()

    if (!currentActivity) {
      throw createError({ statusCode: 404, message: '活动不存在或无权修改' })
    }

    // 3.2 更新活动
    const updatedActivity = tx.update(activities)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning()
      .get()

    if (!updatedActivity) {
      throw createError({ statusCode: 500, message: '更新失败' })
    }

    // 3.3 处理座位变更
    if (updateData.maxParticipants && updateData.maxParticipants !== currentActivity.maxParticipants) {
      const oldMax = currentActivity.maxParticipants
      const newMax = updateData.maxParticipants

      if (newMax > oldMax) {
        // 增加座位
        const seatsToInsert = Array.from({ length: newMax - oldMax }, (_, i) => ({
          activityId: id,
          seatNumber: oldMax + i + 1,
        }))
        tx.insert(activitySeats).values(seatsToInsert).run()
      }
      else {
        // 减少座位 (直接删除多余的座位)
        tx.delete(activitySeats)
          .where(and(
            eq(activitySeats.activityId, id),
            gt(activitySeats.seatNumber, newMax),
          ))
          .run()
      }
    }

    return updatedActivity
  })

  return { activity: result }
})
