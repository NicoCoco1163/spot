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

const form = useForm({
  validationSchema: toTypedSchema(
    z.object({
      mobile: z.string({ required_error: '请输入手机号' })
        .min(1, '请输入手机号')
        .regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
      password: z.string({ required_error: '密码至少6位' }).min(6, '密码至少6位'),
      nickname: z.string().optional(),
    }),
  ),
})

const onSubmit = form.handleSubmit(async (values) => {
  try {
    await authStore.register(values)
    toast.success('注册成功')
    router.push('/')
  }
  catch (error: any) {
    toast.error(error.data?.message || '注册失败')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm space-y-6">
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-bold">
          创建账号
        </h1>
        <p class="text-gray-500 text-sm">
          注册以开始使用
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

        <FormField v-slot="{ componentField }" name="nickname">
          <FormItem>
            <FormLabel>昵称 (可选)</FormLabel>
            <FormControl>
              <Input placeholder="请输入昵称" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button type="submit" class="w-full" size="lg">
          注册
        </Button>
      </form>

      <div class="text-center text-sm text-gray-500">
        已有账号？
        <NuxtLink to="/login" class="text-primary font-medium hover:underline">
          去登录
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
