import { and, eq } from 'drizzle-orm'
import { activitySeats } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { activityId, seatNumber, remark } = body
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      message: '未登录',
    })
  }

  if (!activityId || !seatNumber) {
    throw createError({
      statusCode: 400,
      message: '参数错误',
    })
  }

  // 验证是否是该用户的座位
  const seat = db.select().from(activitySeats).where(
    and(
      eq(activitySeats.activityId, activityId),
      eq(activitySeats.seatNumber, seatNumber),
      eq(activitySeats.userId, user.id),
    ),
  ).get()

  if (!seat) {
    throw createError({
      statusCode: 403,
      message: '您没有权限修改该座位',
    })
  }

  // 更新备注
  db.update(activitySeats)
    .set({ remark: remark || '' })
    .where(eq(activitySeats.id, seat.id))
    .run()

  return { success: true }
})
