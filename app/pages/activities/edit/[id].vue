<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Loader2 } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const dayjs = useDayjs()

const activityId = route.params.id as string

// Fetch existing data
const { data, error } = await useFetch(`/api/activities/user/${activityId}`)

if (error.value || !data.value) {
  // Client side redirect if error
  if (import.meta.client) {
    toast.error('无法加载活动信息')
    router.push('/')
  }
}

const activity = computed(() => data.value?.activity)

// Form Schema
const formSchema = toTypedSchema(z.object({
  title: z.string({ required_error: '请输入标题' }).min(1, '请输入标题'),
  description: z.string().optional(),
  maxParticipants: z.coerce.number({ required_error: '请输入人数' }).int().min(1, '人数至少为 1'),
  startTime: z.string({ required_error: '请选择开始时间' }).min(1, '请选择开始时间'),
  endTime: z.string().optional(),
  status: z.enum(['published', 'cancelled', 'completed']).default('published'),
}))

const form = useForm({
  validationSchema: formSchema,
  initialValues: activity.value
    ? {
        title: activity.value.title,
        description: activity.value.description || '',
        maxParticipants: activity.value.maxParticipants,
        startTime: dayjs(activity.value.startTime).format('YYYY-MM-DDTHH:mm'),
        endTime: activity.value.endTime ? dayjs(activity.value.endTime).format('YYYY-MM-DDTHH:mm') : '',
        status: activity.value.status as 'published' | 'cancelled' | 'completed',
      }
    : undefined,
})

const isSubmitting = ref(false)

const onSubmit = form.handleSubmit(async (values) => {
  if (isSubmitting.value)
    return

  // Check for seat reduction and occupied seats
  if (activity.value && values.maxParticipants < activity.value.maxParticipants) {
    const seats = data.value?.seats || []
    const occupiedSeatsToRemove = seats.filter(s =>
      s.seatNumber > values.maxParticipants && s.isOccupied,
    )

    if (occupiedSeatsToRemove.length > 0) {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(
        `减少位次将移除 ${occupiedSeatsToRemove.length} 个已被占用的位次 (位次号: ${occupiedSeatsToRemove.map(s => s.seatNumber).join(', ')}). \n确定要继续吗?`,
      )
      if (!confirmed)
        return
    }
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/activities/admin/update', {
      method: 'POST',
      body: {
        id: Number.parseInt(activityId),
        ...values,
        startTime: new Date(values.startTime),
        endTime: values.endTime ? new Date(values.endTime) : undefined,
      },
    })
    toast.success('更新成功')
    router.push(`/activities/${activityId}`)
  }
  catch (error: any) {
    toast.error(error.statusMessage || error.message || '更新失败')
  }
  finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#1c1c1e] text-white pb-20 relative">
    <div v-if="activity">
      <!-- Background Blobs -->
      <div class="fixed -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div class="fixed -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <!-- Header -->
      <div class="sticky top-0 z-50 bg-[#1c1c1e] backdrop-blur-xl px-5 py-4 flex items-center justify-between shadow-2xl rounded-b-4xl border-b border-white/5 overflow-hidden mb-4">
        <!-- Header Background Decoration -->
        <div class="absolute -right-4 -top-10 h-24 w-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div class="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        <div class="font-bold text-xl tracking-wide relative z-10">
          编辑活动
        </div>
        <Button variant="ghost" size="sm" class="text-white/60 hover:text-white hover:bg-white/10 relative z-10 rounded-full" @click="router.back()">
          取消
        </Button>
      </div>

      <div class="p-6 max-w-md mx-auto relative z-10">
        <form class="space-y-6" @submit="onSubmit">
          <!-- Title -->
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

          <!-- Description -->
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
            <!-- Start Time -->
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

            <!-- End Time -->
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

          <!-- Max Participants -->
          <FormField v-slot="{ componentField }" name="maxParticipants">
            <FormItem>
              <FormLabel class="text-white/80 pl-1">
                最大人数 (位次数)
              </FormLabel>
              <FormControl>
                <Input type="number" min="1" v-bind="componentField" class="bg-white/5 border-transparent text-white placeholder:text-white/20 focus-visible:ring-white/20 rounded-xl h-12" />
              </FormControl>
              <FormDescription class="text-white/40 pl-1">
                减少位次可能会移除已有占位，请谨慎操作
              </FormDescription>
              <FormMessage class="pl-1" />
            </FormItem>
          </FormField>

          <!-- Status -->
          <FormField v-slot="{ componentField }" name="status">
            <FormItem>
              <FormLabel class="text-white/80 pl-1">
                状态
              </FormLabel>
              <Select v-bind="componentField">
                <FormControl>
                  <SelectTrigger class="bg-white/5 border-transparent text-white focus:ring-white/20 rounded-xl h-12">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent class="bg-[#1c1c1e] border-white/10 text-white">
                  <SelectItem value="published" class="focus:bg-white/10 focus:text-white">
                    发布中
                  </SelectItem>
                  <SelectItem value="cancelled" class="focus:bg-white/10 focus:text-white">
                    已取消
                  </SelectItem>
                  <SelectItem value="completed" class="focus:bg-white/10 focus:text-white">
                    已结束
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage class="pl-1" />
            </FormItem>
          </FormField>

          <!-- Submit -->
          <div class="pt-4">
            <Button type="submit" class="w-full h-12 text-base font-medium rounded-xl bg-white text-black hover:bg-gray-200 border-none shadow-lg shadow-white/5 active:scale-[0.98] transition-all" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
              {{ isSubmitting ? '保存中...' : '保存修改' }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <div v-else class="text-center py-10">
      <Loader2 class="w-8 h-8 animate-spin mx-auto text-gray-400" />
    </div>
  </div>
</template>
