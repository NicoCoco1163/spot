import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../database/schema'
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, createToken, verifyPassword } from '../../utils/auth'
import { db } from '../../utils/db'

const loginSchema = z.object({
  mobile: z.string().min(1, '请输入手机号'),
  password: z.string().min(1, '请输入密码'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // 1. 参数校验
  const result = loginSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues[0].message,
    })
  }

  const { mobile, password } = result.data

  // 2. 查找用户
  const user = db.select().from(users).where(eq(users.mobile, mobile)).get()
  if (!user || !user.password) {
    // 为了安全，统一提示用户名或密码错误
    throw createError({
      statusCode: 401,
      message: '手机号或密码错误',
    })
  }

  // 3. 验证密码
  const isValid = await verifyPassword(user.password, password)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: '手机号或密码错误',
    })
  }

  // 4. 签发 Token
  const token = await createToken({
    id: user.id,
    mobile: user.mobile,
    isAdmin: user.isAdmin,
  })

  setCookie(event, AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS)

  // 5. 返回用户信息
  const { password: _, ...userProfile } = user
  return {
    user: userProfile,
  }
})
