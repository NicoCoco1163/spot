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
const dayjs = useDayjs()

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
  registrationDeadline: z.string({ required_error: '请选择报名截止时间' }).min(1, '请选择报名截止时间'),
}))

const form = useForm({
  validationSchema: formSchema,
})

const quickDeadlineMinutes = ref('15')
const quickDeadlineOptions = [
  { label: '活动开始前 15 分钟', value: '15' },
  { label: '活动开始前 30 分钟', value: '30' },
  { label: '活动开始前 1 小时', value: '60' },
  { label: '活动开始前 2 小时', value: '120' },
  { label: '活动开始前 3 小时', value: '180' },
]

function applyQuickDeadline(minutes: string) {
  if (!form.values.startTime)
    return

  const start = dayjs(form.values.startTime)
  if (!start.isValid())
    return

  form.setFieldValue('registrationDeadline', start.subtract(Number(minutes), 'minute').toISOString())
}

watch(quickDeadlineMinutes, (minutes) => {
  applyQuickDeadline(minutes)
})

watch(() => form.values.startTime, (startTime) => {
  if (!startTime)
    return
  applyQuickDeadline(quickDeadlineMinutes.value)
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
        registrationDeadline: new Date(values.registrationDeadline),
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
  <div class="min-h-screen bg-[#1c1c1e] text-white pb-12 relative">
    <!-- Background Blobs -->
    <div class="fixed -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
    <div class="fixed -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

    <!-- Header -->
    <div class="sticky top-0 z-50 bg-[#1c1c1e] backdrop-blur-xl px-5 py-4 flex items-center justify-between shadow-2xl rounded-b-4xl border-b border-white/5 overflow-hidden">
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
            <FormLabel class="text-white font-semibold pl-1">
              活动标题 <span class="text-red-400">*</span>
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
              <FormLabel class="text-white font-semibold pl-1">
                开始时间 <span class="text-red-400">*</span>
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

        <FormField v-slot="{ componentField }" name="registrationDeadline">
          <FormItem>
            <FormLabel class="text-white font-semibold pl-1">
              报名截止时间 <span class="text-red-400">*</span>
            </FormLabel>
            <FormControl>
              <DateTimePicker v-bind="componentField" placeholder="选择报名截止时间" class="bg-white/5 border-transparent text-white placeholder:text-white/20 rounded-xl h-12" />
            </FormControl>
            <FormDescription class="text-white/40 pl-1">
              截止后自动进入抢座阶段，座位数=报名人数
            </FormDescription>
            <FormMessage class="pl-1" />
          </FormItem>
        </FormField>

        <div class="space-y-2">
          <div class="text-white/70 text-sm pl-1">
            报名截止快捷选择
          </div>
          <Select v-model="quickDeadlineMinutes" :disabled="!form.values.startTime">
            <SelectTrigger class="w-full bg-white/5 border-transparent text-white focus:ring-white/20 rounded-xl h-12 disabled:opacity-50">
              <SelectValue placeholder="请选择活动开始前时间" />
            </SelectTrigger>
            <SelectContent class="bg-[#1c1c1e] border-white/10 text-white">
              <SelectItem
                v-for="item in quickDeadlineOptions"
                :key="item.value"
                :value="item.value"
                class="focus:bg-white/10 focus:text-white"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-white/40 text-xs pl-1">
            选择后会自动将报名截止时间设置为“活动开始前 N 分钟”
          </p>
        </div>

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
