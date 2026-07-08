export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (!authStore.user)
    return navigateTo('/login')

  if (!authStore.user.isAdmin)
    return navigateTo('/')
})
