// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate',
    'motion-v/nuxt',
    'shadcn-nuxt',
    '@nuxtjs/tailwindcss',
    'dayjs-nuxt',
  ],
  runtimeConfig: {
    wechatSecret: '', // NUXT_WECHAT_SECRET
    altchaHmacKey: '', // NUXT_ALTCHA_HMAC_KEY
    public: {
      wechatAppId: '', // NUXT_PUBLIC_WECHAT_APP_ID
    },
  },
  vue: {
    compilerOptions: {
      isCustomElement: tag => tag === 'altcha-widget',
    },
  },
  app: {
    head: {
      meta: [
        // 覆盖默认的 viewport 设置，添加 viewport-fit=cover
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
      ],
      script: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/eruda/3.4.3/eruda.min.js', tagPosition: 'bodyClose' },
        { innerHTML: 'eruda.init();', tagPosition: 'bodyClose' },
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
  ssr: false,
})
