import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  // 1. 从 context 中获取用户信息 (由 auth 中间件注入)
  const userPayload = event.context.user

  if (!userPayload) {
    throw createError({
      statusCode: 401,
      message: '未登录',
    })
  }

  // 2. 从数据库获取最新用户信息 (可选，也可以直接返回 payload)
  // 建议查库以获取最新状态（如是否被禁用、最新昵称等）
  const user = db.select().from(users).where(eq(users.id, userPayload.id)).get()

  if (!user) {
    throw createError({
      statusCode: 401,
      message: '用户不存在',
    })
  }

  // 3. 返回用户信息 (脱敏)
  const { password: _, ...userProfile } = user
  return {
    user: userProfile,
  }
})
