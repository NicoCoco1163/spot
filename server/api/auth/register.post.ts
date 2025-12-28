import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../database/schema'
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, createToken, hashPassword } from '../../utils/auth'
import { db } from '../../utils/db'

// 验证 Schema
const registerSchema = z.object({
  mobile: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码长度至少 6 位'),
  nickname: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // 1. 参数校验
  const result = registerSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0].message,
    })
  }

  const { mobile, password, nickname } = result.data

  // 2. 检查手机号是否已存在
  const existingUser = db.select().from(users).where(eq(users.mobile, mobile)).get()
  if (existingUser) {
    throw createError({
      statusCode: 400,
      message: '该手机号已注册',
    })
  }

  // 3. 创建用户
  const hashedPassword = await hashPassword(password)
  const newUser = db.insert(users).values({
    mobile,
    password: hashedPassword,
    nickname,
  }).returning().get()

  // 4. 自动登录 (签发 Token)
  const token = await createToken({
    id: newUser.id,
    mobile: newUser.mobile,
    isAdmin: newUser.isAdmin,
  })

  setCookie(event, AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS)

  // 5. 返回用户信息 (脱敏)
  const { password: _, ...userProfile } = newUser
  return {
    user: userProfile,
  }
})
