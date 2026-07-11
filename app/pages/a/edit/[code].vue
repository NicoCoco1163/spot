<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { ArrowLeft, Loader2 } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'

definePageMeta({
  middleware: 'admin',
})

const route = useRoute()
const router = useRouter()
const dayjs = useDayjs()

const activityCode = computed(() => String(route.params.code || ''))

// Fetch existing data
const { data, error } = await useFetch(() => `/api/activities/user/${activityCode.value}`)

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
  deadline: z.string({ required_error: '请选择报名截止时间' }).min(1, '请选择报名截止时间'),
  status: z.enum(['published', 'cancelled', 'completed']).default('published'),
}))

const form = useForm({
  validationSchema: formSchema,
  initialValues: activity.value
    ? {
        title: activity.value.title,
        description: activity.value.description || '',
        deadline: activity.value.deadline ? dayjs(activity.value.deadline).format('YYYY-MM-DDTHH:mm') : '',
        status: activity.value.status as 'published' | 'cancelled' | 'completed',
      }
    : undefined,
})

const isSubmitting = ref(false)
const isAdvancing = ref(false)
const showAdvanceConfirm = ref(false)
const canAdvanceToBooking = computed(() => {
  if (!activity.value)
    return false
  if (form.values.status !== 'published')
    return false
  if (!form.values.deadline)
    return false
  const deadline = dayjs(form.values.deadline)
  return deadline.isValid() && dayjs().isBefore(deadline)
})

async function handleAdvanceToBooking() {
  if (isAdvancing.value || !canAdvanceToBooking.value)
    return

  isAdvancing.value = true
  try {
    await $fetch('/api/activities/admin/advance-phase', {
      method: 'POST',
      body: {
        code: activityCode.value,
      },
    })
    toast.success('已切换到抢位阶段')
    showAdvanceConfirm.value = false
    router.push(`/a/${activityCode.value}`)
  }
  catch (error: any) {
    toast.error(error.data?.message || error.statusMessage || error.message || '切换阶段失败')
  }
  finally {
    isAdvancing.value = false
  }
}

function openAdvanceConfirm() {
  if (!canAdvanceToBooking.value || isAdvancing.value)
    return
  showAdvanceConfirm.value = true
}

const onSubmit = form.handleSubmit(async (values) => {
  if (isSubmitting.value)
    return

  isSubmitting.value = true

  try {
    await $fetch('/api/activities/admin/update', {
      method: 'POST',
      body: {
        code: activityCode.value,
        ...values,
        deadline: new Date(values.deadline),
      },
    })
    toast.success('更新成功')
    router.push(`/a/${activityCode.value}`)
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
  <div class="min-h-screen bg-muted/30 pb-8">
    <div v-if="activity">
      <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div class="mx-auto flex w-full max-w-full items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" @click="router.back()">
            <ArrowLeft class="h-4 w-4" />
            <span class="sr-only">返回</span>
          </Button>
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-base font-semibold leading-6">编辑活动</h1>
            <p class="truncate text-xs text-muted-foreground">
              {{ activity.title }}
            </p>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-full space-y-3 p-3">
        <div class="rounded-lg border bg-background">
          <div class="border-b p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="text-base font-semibold leading-6">活动信息</h2>
                <p class="text-sm text-muted-foreground">
                  修改后会同步影响公开详情页展示。
                </p>
              </div>
              <Badge variant="outline" class="shrink-0">
                管理员
              </Badge>
            </div>
          </div>

          <form class="space-y-4 p-3" @submit="onSubmit">
            <FormField v-slot="{ componentField }" name="title">
              <FormItem>
                <FormLabel>
                  活动标题 <span class="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="text" placeholder="例如：周五中午截止的报名" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="description">
              <FormItem>
                <FormLabel>活动描述</FormLabel>
                <FormControl>
                  <Textarea placeholder="填写活动说明、规则或现场提示" class="min-h-24 resize-none" rows="4" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="deadline">
              <FormItem>
                <FormLabel>
                  报名截止时间 <span class="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <DateTimePicker v-bind="componentField" placeholder="选择报名截止时间" />
                </FormControl>
                <FormDescription>
                  截止前可报名；截止后只允许已报名手机号抢位，位次数等于报名人数。
                </FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="status">
              <FormItem>
                <FormLabel>活动状态</FormLabel>
                <Select v-bind="componentField">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="published">
                      发布中
                    </SelectItem>
                    <SelectItem value="cancelled">
                      已取消
                    </SelectItem>
                    <SelectItem value="completed">
                      已结束
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>

            <div v-if="canAdvanceToBooking" class="rounded-lg border bg-muted/30 p-3">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-medium">阶段操作</div>
                  <div class="text-xs leading-5 text-muted-foreground">
                    立即结束报名，并开放已报名手机号抢位。
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  class="h-8 shrink-0"
                  :disabled="isAdvancing"
                  @click="openAdvanceConfirm"
                >
                  <Loader2 v-if="isAdvancing" class="mr-2 h-4 w-4 animate-spin" />
                  {{ isAdvancing ? '切换中' : '进入抢位' }}
                </Button>
              </div>
            </div>

            <div class="pt-2">
              <Button type="submit" class="h-8 w-full" :disabled="isSubmitting || isAdvancing">
                <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
                {{ isSubmitting ? '保存中' : '保存修改' }}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>

    <div v-else class="flex min-h-screen items-center justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>

    <Dialog v-model:open="showAdvanceConfirm">
      <DialogContent class="max-w-[calc(100%-1.5rem)]">
        <DialogHeader>
          <DialogTitle>确认进入抢位阶段</DialogTitle>
          <DialogDescription>
            进入后将结束报名并开放抢位，仅已报名手机号可以抢位，此操作不可撤回。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" @click="showAdvanceConfirm = false">
            取消
          </Button>
          <Button size="sm" variant="destructive" :disabled="isAdvancing" @click="handleAdvanceToBooking">
            <Loader2 v-if="isAdvancing" class="w-4 h-4 mr-2 animate-spin" />
            {{ isAdvancing ? '切换中...' : '确认进入' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
