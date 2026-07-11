import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats, registrationDevices, registrations } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'
import { mainlandMobilePattern, normalizeMobile } from '../../../utils/mobile'

const schema = z.object({
  activityCode: z.string().regex(activityCodeSchema, '活动不存在'),
  mobile: z.string().transform(normalizeMobile).pipe(z.string().regex(mainlandMobilePattern, '请输入有效的中国大陆手机号')),
  deviceKey: z.string().trim().min(16).max(128).optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message || '参数错误' })
  const { activityCode, mobile, deviceKey } = parsed.data
  const isAdmin = !!event.context.user?.isAdmin

  db.transaction((tx) => {
    const activity = tx.select().from(activities).where(eq(activities.code, activityCode)).get()
    if (!activity)
      throw createError({ statusCode: 404, message: '活动不存在' })
    if (activity.status !== 'published')
      throw createError({ statusCode: 400, message: '活动不可操作' })
    if (!isAdmin && getActivityPhase(activity) !== 'registration')
      throw createError({ statusCode: 400, message: '报名已截止，无法删除报名' })

    const registration = tx.select().from(registrations).where(and(
      eq(registrations.activityId, activity.id),
      eq(registrations.mobile, mobile),
    )).get()
    if (!registration)
      throw createError({ statusCode: 404, message: '报名记录不存在' })
    if (!isAdmin) {
      const device = deviceKey
        ? tx.select().from(registrationDevices).where(and(
            eq(registrationDevices.activityId, activity.id),
            eq(registrationDevices.deviceKey, deviceKey),
            eq(registrationDevices.registrationId, registration.id),
          )).get()
        : null
      if (!device)
        throw createError({ statusCode: 403, message: '只能删除当前浏览器提交的报名' })
    }

    tx.update(activitySeats).set({
      mobile: null,
      registrationId: null,
      remark: null,
      occupiedAt: null,
    }).where(and(
      eq(activitySeats.activityId, activity.id),
      eq(activitySeats.registrationId, registration.id),
    )).run()
    tx.delete(registrationDevices).where(eq(registrationDevices.registrationId, registration.id)).run()
    tx.delete(registrations).where(eq(registrations.id, registration.id)).run()
  })

  return { success: true }
})
