import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as IUser | null,
  }),
  actions: {
    async fetchUser() {
      try {
        const headers = useRequestHeaders(['cookie'])
        const { user } = await $fetch<{ user: IUser }>('/api/auth/me', { headers })
        this.user = user
      }
      catch {
        this.user = null
      }
    },
    async login(body: {
      mobile: string
      password: string
    }) {
      const { user } = await $fetch<{ user: IUser }>('/api/auth/login', {
        method: 'POST',
        body,
      })
      this.user = user
    },
    async register(body: {
      mobile: string
      password: string
      nickname: string
    }) {
      const { user } = await $fetch<{ user: IUser }>('/api/auth/register', {
        method: 'POST',
        body,
      })
      this.user = user
    },
    async logout() {
      try {
        await $fetch<{
          message: string
        }>('/api/auth/logout', { method: 'POST' })
      }
      catch {
        // 忽略错误，强制前端登出
      }
      this.user = null
    },
    async updateProfile(body: { nickname: string }) {
      const { user } = await $fetch<{ user: IUser }>('/api/user/profile', {
        method: 'PUT',
        body,
      })
      this.user = user
    },
    async unbindWechat() {
      const { user } = await $fetch<{ user: IUser }>('/api/user/unbind-wechat', {
        method: 'POST',
      })
      this.user = user
    },
  },
  persist: true, // 使用 pinia-plugin-persistedstate
})
