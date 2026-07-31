import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { activities, activitySeats, registrations } from '../../../database/schema'
import { activityCodeSchema } from '../../../utils/activity-code'
import { canOccupySeat } from '../../../utils/activity-phase'
import { db } from '../../../utils/db'

const fillRemainingSeatsSchema = z.object({
  activityCode: z.string().regex(activityCodeSchema, '活动不存在'),
  expectedEmptyCount: z.number().int().positive('剩余空位数必须为正整数'),
})

function canRegistrationOccupy(registration: { teamName: string | null, songName: string | null }) {
  return !!registration.teamName?.trim() && !!registration.songName?.trim()
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user || !user.isAdmin) {
    throw createError({ statusCode: 403, message: '无权操作' })
  }

  const body = await readBody(event)
  const validation = fillRemainingSeatsSchema.safeParse(body)
  if (!validation.success) {
    const firstError = validation.error.issues[0]
    throw createError({ statusCode: 400, message: firstError?.message || '参数错误' })
  }

  const { activityCode, expectedEmptyCount } = validation.data

  const result = db.transaction((tx) => {
    const activity = tx.select().from(activities).where(eq(activities.code, activityCode)).get()
    if (!activity) {
      throw createError({ statusCode: 404, message: '活动不存在' })
    }
    if (activity.status !== 'published') {
      throw createError({ statusCode: 400, message: '活动未开始或已结束' })
    }
    if (!canOccupySeat(activity)) {
      throw createError({ statusCode: 400, message: '当前不在占位阶段' })
    }

    const activityId = activity.id
    const seats = tx.select()
      .from(activitySeats)
      .where(eq(activitySeats.activityId, activityId))
      .orderBy(asc(activitySeats.seatNumber))
      .all()

    const emptySeats = seats.filter(seat => !seat.mobile)
    const emptyCount = emptySeats.length

    if (emptyCount === 0) {
      throw createError({ statusCode: 400, message: '当前无剩余空位' })
    }
    if (emptyCount !== expectedEmptyCount) {
      throw createError({ statusCode: 400, message: '剩余空位数已变化，请刷新后重试' })
    }

    const occupiedMobiles = new Set(
      seats.filter(seat => seat.mobile).map(seat => seat.mobile as string),
    )

    const registrationList = tx.select()
      .from(registrations)
      .where(eq(registrations.activityId, activityId))
      .orderBy(asc(registrations.createdAt))
      .all()

    const unoccupiedRegistrations = registrationList.filter(reg => !occupiedMobiles.has(reg.mobile))
    const eligibleCandidates = unoccupiedRegistrations.filter(canRegistrationOccupy)
    const skippedIncomplete = unoccupiedRegistrations.length - eligibleCandidates.length

    if (eligibleCandidates.length === 0) {
      throw createError({ statusCode: 400, message: '没有满足占位要求的未抢位用户（需补齐队伍名称和歌曲名称）' })
    }

    const now = new Date()
    const filledSeats: { seatNumber: number, mobile: string }[] = []
    const pairCount = Math.min(emptySeats.length, eligibleCandidates.length)

    for (let i = 0; i < pairCount; i++) {
      const seat = emptySeats[i]!
      const registration = eligibleCandidates[i]!

      const updatedSeat = tx.update(activitySeats)
        .set({
          mobile: registration.mobile,
          registrationId: registration.id,
          remark: null,
          occupiedAt: now,
        })
        .where(and(
          eq(activitySeats.id, seat.id),
          isNull(activitySeats.mobile),
        ))
        .returning()
        .get()

      if (!updatedSeat) {
        throw createError({ statusCode: 409, message: '位次状态已变化，请刷新后重试' })
      }

      filledSeats.push({
        seatNumber: seat.seatNumber,
        mobile: registration.mobile,
      })
    }

    return {
      filled: filledSeats.length,
      emptyBefore: emptyCount,
      emptyAfter: emptyCount - filledSeats.length,
      eligibleCandidates: eligibleCandidates.length,
      skippedIncomplete,
      filledSeats,
    }
  })

  return result
})
