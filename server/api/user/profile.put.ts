import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../database/schema'
import { db } from '../../utils/db'

const updateProfileSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空').max(20, '昵称不能超过20个字符'),
})

export default defineEventHandler(async (event) => {
  // 1. 鉴权
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: '请先登录' })
  }

  // 2. 校验
  const body = await readBody(event)
  const validation = updateProfileSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, message: validation.error.issues[0].message })
  }
  const { nickname } = validation.data

  // 3. 更新
  const updatedUser = db.update(users)
    .set({
      nickname,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning()
    .get()

  if (!updatedUser) {
    throw createError({ statusCode: 500, message: '更新失败' })
  }

  // 4. 返回更新后的用户信息 (脱敏)
  const { password: _, ...userProfile } = updatedUser
  return { user: userProfile }
})
