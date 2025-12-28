import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, createToken } from '../../utils/auth'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { code } = body

  if (!code) {
    throw createError({
      statusCode: 400,
      message: '缺少 code 参数',
    })
  }

  const appId = config.public.wechatAppId
  const secret = config.wechatSecret

  if (!appId || !secret) {
    throw createError({
      statusCode: 500,
      message: '服务器未配置微信参数',
    })
  }

  // 1. 使用 code 换取 access_token 和 openid
  const tokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token?'
    + `appid=${appId}&`
    + `secret=${secret}&`
    + `code=${code}&`
    + 'grant_type=authorization_code'

  try {
    const data: any = await $fetch(tokenUrl)

    if (data.errcode) {
      throw createError({
        statusCode: 400,
        message: `微信授权失败: ${data.errmsg}`,
      })
    }

    const { openid } = data

    if (!openid) {
      throw createError({
        statusCode: 400,
        message: '未获取到 OpenID',
      })
    }

    // 2. 查找或创建用户
    let user = db.select().from(users).where(eq(users.openid, openid)).get()

    if (!user) {
      // 创建新用户
      const result = db.insert(users).values({
        openid,
        nickname: `微信用户_${openid.slice(-4)}`, // 默认昵称
      }).returning().get()
      user = result
    }

    // 3. 签发 Token
    const token = await createToken({
      id: user.id,
      mobile: user.mobile,
      isAdmin: user.isAdmin,
    })

    setCookie(event, AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS)

    // 4. 返回用户信息
    const { password: _, ...userProfile } = user
    return {
      user: userProfile,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '微信登录失败',
    })
  }
})
