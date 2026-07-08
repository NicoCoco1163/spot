<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
  middleware: 'guest',
})

const authStore = useAuthStore()
const router = useRouter()
// const route = useRoute()
const ua = ref('')
const isAltchaLoaded = ref(false)
const altchaError = ref('')
const isAltchaVerified = ref(false)
const shouldShowAltcha = ref(false)
const altchaStrings = JSON.stringify({
  ariaLinkLabel: '关于 Altcha 验证服务',
  enterCode: '请输入图中验证码',
  enterCodeAria: '输入图中验证码',
  error: '验证失败，请重试',
  expired: '验证已过期，请刷新',
  footer: '由 ALTCHA 提供验证能力',
  getAudioChallenge: '获取语音验证码',
  label: '我不是机器人',
  loading: '加载中...',
  reload: '刷新验证',
  verificationRequired: '请先完成人机验证',
  verified: '验证通过',
  verifying: '验证中...',
  waitAlert: '请稍候，正在校验',
})

onMounted(async () => {
  ua.value = navigator.userAgent
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  const isHttps = window.location.protocol === 'https:'
  shouldShowAltcha.value = isHttps || isLocalhost

  if (shouldShowAltcha.value) {
    await loadAltchaLibrary()
  }
  else {
    isAltchaVerified.value = true
  }
})

async function loadAltchaLibrary() {
  if (customElements.get('altcha-widget')) {
    isAltchaLoaded.value = true
    return
  }

  try {
    await import('altcha')
    isAltchaLoaded.value = true
    altchaError.value = ''
  }
  catch (error) {
    isAltchaLoaded.value = false
    altchaError.value = error instanceof Error ? error.message : '验证码组件加载失败'
  }
}

function handleAltchaStateChange(event: CustomEvent) {
  const state = event.detail?.state
  if (state !== 'verified') {
    isAltchaVerified.value = false
  }
}

async function handleAltchaVerified(event: CustomEvent) {
  const payload = event.detail?.payload

  if (typeof payload !== 'string') {
    isAltchaVerified.value = false
    altchaError.value = '验证码数据无效，请重试'
    return
  }

  try {
    const decodedPayload = JSON.parse(atob(payload))
    const result = await $fetch<{ verified: boolean, message?: string }>('/api/altcha/verify', {
      method: 'POST',
      body: decodedPayload,
    })

    if (!result.verified) {
      isAltchaVerified.value = false
      altchaError.value = result.message || '验证码校验失败，请重试'
      return
    }

    isAltchaVerified.value = true
    altchaError.value = ''
  }
  catch {
    isAltchaVerified.value = false
    altchaError.value = '验证码校验失败，请重试'
  }
}

const form = useForm({
  validationSchema: toTypedSchema(
    z.object({
      mobile: z.string({ required_error: '请输入手机号' }).min(1, '请输入手机号'),
      password: z.string({ required_error: '请输入密码' }).min(1, '请输入密码'),
    }),
  ),
})

const onSubmit = form.handleSubmit(async (values) => {
  if (shouldShowAltcha.value && !isAltchaVerified.value) {
    toast.error('请先完成人机验证')
    return
  }

  try {
    await authStore.login(values)
    toast.success('登录成功')
    router.push('/')
  }
  catch (error: any) {
    toast.error(error.data?.message || '登录失败')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm space-y-6 mb-6 px-6">
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-bold">
          欢迎回来
        </h1>
        <p class="text-gray-500 text-sm">
          管理员登录
        </p>
      </div>

      <form class="space-y-4" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="mobile">
          <FormItem>
            <FormLabel>手机号</FormLabel>
            <FormControl>
              <Input type="tel" placeholder="请输入手机号" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>密码</FormLabel>
            <FormControl>
              <Input type="password" placeholder="请输入密码" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div v-if="shouldShowAltcha" class="space-y-2">
          <p class="text-sm text-gray-600">
            安全验证
          </p>

          <ClientOnly>
            <!-- eslint-disable-next-line -->
            <altcha-widget
              v-if="isAltchaLoaded"
              challengeurl="/api/altcha/challenge"
              :strings="altchaStrings"
              hidefooter
              hidelogo
              @statechange="handleAltchaStateChange"
              @verified="handleAltchaVerified"
            />

            <div v-else class="h-9 rounded-md bg-gray-100 animate-pulse" />
          </ClientOnly>

          <p v-if="altchaError" class="text-xs text-red-500">
            {{ altchaError }}
          </p>
        </div>

        <Button :disabled="(shouldShowAltcha && !isAltchaVerified) || form.isSubmitting.value" type="submit" class="w-full" size="lg">
          登录
        </Button>
      </form>

      <div class="text-center text-sm text-gray-500">
        参与活动无需登录，返回首页选择活动后用手机号报名。
      </div>

      <!-- <div class="mt-8 py-4 border-t text-xs text-gray-400 break-all space-y-2">
        <div>
          <span class="font-medium">UA:</span> {{ ua }}
        </div>
        <div>
          <span class="font-medium">OpenID:</span> {{ authStore.user?.openid || '-' }}
        </div>
        <div>
          <span class="font-medium">Query:</span> {{ JSON.stringify(route.query) }}
        </div>
      </div> -->
    </div>
  </div>
</template>

<style scoped>
:deep(altcha-widget) {
  --altcha-color-base: #F6F7FB;
  --altcha-color-text: #4E5969;
  --altcha-color-border: #E3E6EB;
  --altcha-color-border-focus: #2764FF;
  --altcha-max-width: 100%;
  --altcha-border-width: 1px;
  --altcha-border-radius: 8px;
  box-sizing: border-box;
  width: 100%;

  .altcha {
    box-shadow: inset 0 0 0 1px var(--altcha-color-border), 0px 1px 2px 0px rgba(0, 0, 0, 0.04);
    border: 0;
    border-left: 4px solid var(--altcha-color-border-focus);
    box-sizing: border-box;
    background: linear-gradient(180deg, #FFFFFF 0%, #F6F7F8 50%, #FCFDFE 100%);
    border-radius: 8px;
  }

  .altcha-main {
    gap: 0;
    padding: 0 0 0 10px;
    min-height: 40px;
  }

  .altcha-checkbox {
    width: 20px;
    height: 20px;

    input {
      width: 16px;
      height: 16px;
      border: 2px solid #2764FF;
      border-radius: 100%;
    }
  }

  .altcha-label {
    font-size: 13px;
    line-height: 22px;
    padding: 8px 10px 8px 8px;
  }
}
</style>
