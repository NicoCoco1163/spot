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
const route = useRoute()
const ua = ref('')

onMounted(() => {
  ua.value = navigator.userAgent
})

const form = useForm({
  validationSchema: toTypedSchema(
    z.object({
      mobile: z.string({ required_error: '请输入手机号' }).min(1, '请输入手机号'),
      password: z.string({ required_error: '请输入密码' }).min(1, '请输入密码'),
    }),
  ),
})

const onSubmit = form.handleSubmit(async (values) => {
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
          登录您的账号
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

        <Button type="submit" class="w-full" size="lg">
          登录
        </Button>
      </form>

      <div class="text-center text-sm text-gray-500">
        还没有账号？
        <NuxtLink to="/register" class="text-primary font-medium hover:underline">
          去注册
        </NuxtLink>
      </div>

      <div class="mt-8 py-4 border-t text-xs text-gray-400 break-all space-y-2">
        <div>
          <span class="font-medium">UA:</span> {{ ua }}
        </div>
        <div>
          <span class="font-medium">OpenID:</span> {{ authStore.user?.openid || '-' }}
        </div>
        <div>
          <span class="font-medium">Query:</span> {{ JSON.stringify(route.query) }}
        </div>
      </div>
    </div>
  </div>
</template>
