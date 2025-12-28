import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  // 2. 解除绑定
  const updatedUser = db.update(users)
    .set({
      openid: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning()
    .get()

  if (!updatedUser) {
    throw createError({ statusCode: 500, message: '解绑失败' })
  }

  // 3. 返回更新后的用户信息 (脱敏)
  const { password: _, ...userProfile } = updatedUser
  return { user: userProfile }
})
