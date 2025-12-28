// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate',
    'motion-v/nuxt',
    'shadcn-nuxt',
    '@nuxtjs/tailwindcss',
    'dayjs-nuxt',
  ],
  app: {
    head: {
      meta: [
        // 覆盖默认的 viewport 设置，添加 viewport-fit=cover
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
      ],
    },
  },
  eslint: {
    config: {
      standalone: false,
    },
  },
  dayjs: {
    locales: ['zh-cn'],
    defaultLocale: 'zh-cn',
  },
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
  nitro: {
    preset: 'bun',
  },
  ssr: false,
})
