export default defineNuxtPlugin(async () => {
  const route = useRoute()
  const authStore = useAuthStore()
  const config = useRuntimeConfig()

  // 1. 检测是否在微信浏览器中
  const ua = navigator.userAgent.toLowerCase()
  const isWeChat = ua.includes('micromessenger')

  console.warn('[WeChat Auth] UA:', ua)
  console.warn('[WeChat Auth] isWeChat:', isWeChat)

  if (!isWeChat)
    return

  // 2. 如果已经登录，且已绑定OpenID（假设user对象里有openid字段），则无需操作
  console.warn('[WeChat Auth] User:', authStore.user)
  if (authStore.user) {
    console.warn('[WeChat Auth] User already logged in, skipping auth')
    return
  }

  // 3. 检查 URL 中是否有 code
  const code = route.query.code as string
  console.warn('[WeChat Auth] Code:', code)

  if (code) {
    // 4. 有 code，调用后端接口进行静默登录/获取OpenID
    try {
      console.warn('[WeChat Auth] Logging in with code...')
      await authStore.loginWithWechat(code)

      // 登录成功后，清除 URL 中的 code 参数，保持 URL 干净
      // 注意：这里需要小心处理，避免页面刷新导致状态丢失，通常使用 replace
      const query = { ...route.query }
      delete query.code
      delete query.state

      console.warn('[WeChat Auth] Login success, cleaning URL')
      // 使用 navigateTo 替换当前历史记录
      await navigateTo({
        path: route.path,
        query,
      }, { replace: true })
    }
    catch (error) {
      console.error('[WeChat Auth] Silent login failed:', error)
      // 登录失败是否重试？暂时不重试，避免死循环
    }
  }
  else {
    // 5. 没有 code，且未登录，跳转微信授权
    // 获取 AppID
    const appId = config.public.wechatAppId
    console.warn('[WeChat Auth] AppID:', appId)

    if (!appId) {
      console.warn('[WeChat Auth] WeChat AppID not configured')
      return
    }

    const redirectUri = encodeURIComponent(window.location.href)
    const scope = 'snsapi_base' // 静默授权，只获取 OpenID
    const state = 'wechat_silent_login'

    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`

    console.warn('[WeChat Auth] Redirecting to:', authUrl)
    // 跳转
    window.location.href = authUrl
  }
})
