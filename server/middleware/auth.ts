import { AUTH_COOKIE_NAME, verifyToken } from '../utils/auth'

export default defineEventHandler(async (event) => {
  // 1. 获取 Cookie
  const token = getCookie(event, AUTH_COOKIE_NAME)

  if (token) {
    // 2. 验证 Token
    const payload = await verifyToken(token)

    // 3. 如果验证通过，将用户信息注入 event.context
    if (payload) {
      event.context.user = payload
    }
  }
})

// 类型扩展，让 TS 知道 event.context.user 存在
declare module 'h3' {
  interface H3EventContext {
    user?: any
  }
}
