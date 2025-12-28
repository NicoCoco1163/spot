<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Loader2 } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (!authStore.user?.isAdmin) {
    toast.error('无权访问')
    router.push('/')
  }
})

const formSchema = toTypedSchema(z.object({
  title: z.string({ required_error: '请输入标题' }).min(1, '请输入标题'),
  description: z.string().optional(),
  startTime: z.string({ required_error: '请选择开始时间' }).min(1, '请选择开始时间'),
  endTime: z.string().optional(),
  maxParticipants: z.coerce.number({ required_error: '请输入人数' }).min(1, '至少1人').default(20),
}))

const form = useForm({
  validationSchema: formSchema,
})

const isSubmitting = ref(false)

const onSubmit = form.handleSubmit(async (values) => {
  if (isSubmitting.value)
    return
  isSubmitting.value = true

  try {
    await $fetch('/api/activities/admin/create', {
      method: 'POST',
      body: {
        ...values,
        startTime: new Date(values.startTime),
        endTime: values.endTime ? new Date(values.endTime) : undefined,
      },
    })
    toast.success('创建成功')
    router.push('/')
  }
  catch (error: any) {
    toast.error(error.statusMessage || error.message || '创建失败')
  }
  finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#1c1c1e] text-white pb-20 relative">
    <!-- Background Blobs -->
    <div class="fixed -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
    <div class="fixed -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

    <!-- Header -->
    <div class="sticky top-0 z-50 bg-[#1c1c1e] backdrop-blur-xl px-5 py-4 flex items-center justify-between shadow-2xl rounded-b-4xl border-b border-white/5 overflow-hidden mb-4">
      <!-- Header Background Decoration -->
      <div class="absolute -right-4 -top-10 h-24 w-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div class="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      <div class="font-bold text-xl tracking-wide relative z-10">
        创建新活动
      </div>
      <Button variant="ghost" size="sm" class="text-white/60 hover:text-white hover:bg-white/10 relative z-10 rounded-full" @click="router.back()">
        取消
      </Button>
    </div>

    <div class="p-6 max-w-md mx-auto relative z-10">
      <form class="space-y-6" @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="title">
          <FormItem>
            <FormLabel class="text-white/80 pl-1">
              活动标题
            </FormLabel>
            <FormControl>
              <Input type="text" placeholder="例如：周五羽毛球局" v-bind="componentField" class="bg-white/5 border-transparent text-white placeholder:text-white/20 focus-visible:ring-white/20 rounded-xl h-12" />
            </FormControl>
            <FormMessage class="pl-1" />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="description">
          <FormItem>
            <FormLabel class="text-white/80 pl-1">
              活动描述
            </FormLabel>
            <FormControl>
              <Textarea placeholder="介绍一下活动规则..." class="resize-none bg-white/5 border-transparent text-white placeholder:text-white/20 focus-visible:ring-white/20 rounded-xl p-4" rows="4" v-bind="componentField" />
            </FormControl>
            <FormMessage class="pl-1" />
          </FormItem>
        </FormField>

        <div class="grid grid-cols-2 gap-4">
          <FormField v-slot="{ componentField }" name="startTime">
            <FormItem>
              <FormLabel class="text-white/80 pl-1">
                开始时间
              </FormLabel>
              <FormControl>
                <DateTimePicker v-bind="componentField" placeholder="选择开始时间" class="bg-white/5 border-transparent text-white placeholder:text-white/20 rounded-xl h-12" />
              </FormControl>
              <FormMessage class="pl-1" />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="endTime">
            <FormItem>
              <FormLabel class="text-white/80 pl-1">
                结束时间 (可选)
              </FormLabel>
              <FormControl>
                <DateTimePicker v-bind="componentField" placeholder="选择结束时间" class="bg-white/5 border-transparent text-white placeholder:text-white/20 rounded-xl h-12" />
              </FormControl>
              <FormMessage class="pl-1" />
            </FormItem>
          </FormField>
        </div>

        <FormField v-slot="{ componentField }" name="maxParticipants">
          <FormItem>
            <FormLabel class="text-white/80 pl-1">
              最大人数 (位次数)
            </FormLabel>
            <FormControl>
              <Input type="number" min="1" v-bind="componentField" class="bg-white/5 border-transparent text-white placeholder:text-white/20 focus-visible:ring-white/20 rounded-xl h-12" />
            </FormControl>
            <FormDescription class="text-white/40 pl-1">
              创建后将自动生成对应数量的位次
            </FormDescription>
            <FormMessage class="pl-1" />
          </FormItem>
        </FormField>

        <div class="pt-4">
          <Button type="submit" class="w-full h-12 text-base font-medium rounded-xl bg-white text-black hover:bg-gray-200 border-none shadow-lg shadow-white/5 active:scale-[0.98] transition-all" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
            {{ isSubmitting ? '创建中...' : '立即创建' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
