import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { activities, registrationDevices, registrations } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { getActivityPhase } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'
import { mainlandMobilePattern, normalizeMobile } from '../../../utils/mobile'

const registerSchema = z.object({
  activityCode: z.string().regex(activityCodeSchema, '活动不存在'),
  mobile: z.string().transform(normalizeMobile).pipe(z.string().regex(mainlandMobilePattern, '请输入有效的中国大陆手机号')),
  deviceKey: z.string().trim().min(16, '浏览器设备标识无效').max(128, '浏览器设备标识无效'),
  teamName: z.string({ required_error: '请输入队伍名称' }).trim().min(1, '请输入队伍名称').max(100, '队伍名称最多 100 字'),
  songName: z.string().trim().max(100, '歌曲名称最多 100 字').optional(),
  songDuration: z.coerce.number().int().positive('歌曲时长必须大于 0').max(36000, '歌曲时长过长').nullable().optional(),
  members: z.string().trim().max(500, '队员名称最多 500 字').optional(),
})

export default defineEventHandler(async (event) => {
  // 1. 校验参数
  const body = await readBody(event)
  const validation = registerSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }
  const { activityCode, mobile, deviceKey, teamName, songName, songDuration, members } = validation.data

  const registration = db.transaction((tx) => {
    // 2. 检查活动状态
    const activity = tx.select().from(activities).where(eq(activities.code, activityCode)).get()
    if (!activity) {
      throw createError({ statusCode: 404, message: '活动不存在' })
    }
    const activityId = activity.id

    if (activity.status !== 'published') {
      throw createError({ statusCode: 400, message: '活动未发布或已结束' })
    }

    const phase = getActivityPhase(activity)

    // 3. 查询手机号和浏览器设备当前绑定
    const existingRegistration = tx.select()
      .from(registrations)
      .where(and(
        eq(registrations.activityId, activityId),
        eq(registrations.mobile, mobile),
      ))
      .get()

    const existingDevice = tx.select()
      .from(registrationDevices)
      .where(and(
        eq(registrationDevices.activityId, activityId),
        eq(registrationDevices.deviceKey, deviceKey),
      ))
      .get()

    if (existingDevice && (!existingRegistration || existingDevice.registrationId !== existingRegistration.id)) {
      throw createError({ statusCode: 409, message: '当前浏览器已完成报名，请使用原手机号修改报名信息' })
    }

    if (phase === 'booking' && !existingRegistration) {
      throw createError({ statusCode: 400, message: '报名已截止，仅支持修改已报名信息' })
    }

    // 4. Upsert / Update 报名信息
    const updateValues = {
      teamName: teamName || null,
      songName: songName || null,
      songDuration: songDuration ?? null,
      members: members || null,
      updatedAt: new Date(),
    }

    const nextRegistration = existingRegistration
      ? tx.update(registrations)
          .set(updateValues)
          .where(eq(registrations.id, existingRegistration.id))
          .returning()
          .get()
      : tx.insert(registrations)
          .values({
            activityId,
            mobile,
            ...updateValues,
          })
          .returning()
          .get()

    if (!existingDevice) {
      tx.insert(registrationDevices)
        .values({
          activityId,
          registrationId: nextRegistration.id,
          deviceKey,
        })
        .run()
    }

    return nextRegistration
  })

  return { registration }
})
