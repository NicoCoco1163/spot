export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // 仅在客户端初始化时获取用户信息，或者在服务端渲染时尝试获取
  // 如果已经有 persisted state，这里会覆盖刷新
  await authStore.fetchUser()
})
