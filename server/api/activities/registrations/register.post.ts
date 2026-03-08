import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, registrations } from '../../../database/schema'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'

const registerSchema = z.object({
  activityId: z.number().int(),
  song: z.string().trim().min(1, '请输入表演歌曲').max(100, '歌曲名称最多 100 字'),
  captain: z.string().trim().min(1, '请输入队长姓名').max(50, '队长姓名最多 50 字'),
  members: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  // 2. 校验参数
  const body = await readBody(event)
  const validation = registerSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }
  const { activityId, song, captain, members } = validation.data

  // 3. 检查活动状态
  const activity = db.select().from(activities).where(eq(activities.id, activityId)).get()
  if (!activity) {
    throw createError({ statusCode: 404, message: '活动不存在' })
  }

  if (activity.status === 'cancelled' || activity.status === 'completed') {
    throw createError({ statusCode: 400, message: '活动未开始或已结束' })
  }

  const phase = getActivityPhase(activity)

  // 4. 查询用户当前报名记录
  const existingRegistration = db.select()
    .from(registrations)
    .where(and(
      eq(registrations.activityId, activityId),
      eq(registrations.userId, user.id),
    ))
    .get()

  if (phase === 'booking' && !existingRegistration) {
    throw createError({ statusCode: 400, message: '报名已截止，仅支持修改已报名信息' })
  }

  // 5. Upsert / Update 报名信息
  let registration
  if (existingRegistration) {
    registration = db.update(registrations)
      .set({
        song,
        captain,
        members,
        updatedAt: new Date(),
      })
      .where(eq(registrations.id, existingRegistration.id))
      .returning()
      .get()
  }
  else {
    registration = db.insert(registrations)
      .values({
        activityId,
        userId: user.id,
        song,
        captain,
        members,
      })
      .returning()
      .get()
  }

  return { registration }
})
