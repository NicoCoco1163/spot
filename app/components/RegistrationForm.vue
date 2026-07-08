<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Loader2 } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'
import { getOrCreateBrowserDeviceKey } from '~/utils/device'
import { isMainlandMobile, normalizeMobile } from '~/utils/mobile'

const props = defineProps<{
  activityCode: string
  initialData?: {
    mobile?: string | null
    teamName?: string | null
    songName?: string | null
    songDuration?: number | null
    members?: string | null
  } | null
  defaultMobile?: string
  lockMobile?: boolean
  requireDetails?: boolean
}>()

const emit = defineEmits<{
  success: [mobile: string]
}>()

const isSubmitting = ref(false)
const formSchema = toTypedSchema(z.object({
  mobile: z.string({ required_error: '请输入手机号' }).refine(isMainlandMobile, '请输入有效的中国大陆手机号'),
  teamName: z.string({ required_error: '请输入队伍名称' }).trim().min(1, '请输入队伍名称').max(100, '队伍名称最多 100 字'),
  songName: z.string().trim().max(100, '歌曲名称最多 100 字').optional(),
  songDuration: z.preprocess(
    value => value === '' || value === null || value === undefined ? undefined : Number(value),
    z.number().int().positive('歌曲时长必须大于 0').max(36000, '歌曲时长过长').optional(),
  ),
  members: z.string().trim().max(500, '队员名称最多 500 字').optional(),
}))

function getFormValues() {
  return {
    mobile: props.initialData?.mobile || props.defaultMobile || '',
    teamName: props.initialData?.teamName || '',
    songName: props.initialData?.songName || '',
    songDuration: props.initialData?.songDuration ?? undefined,
    members: props.initialData?.members || '',
  }
}

const form = useForm({
  validationSchema: formSchema,
  initialValues: getFormValues(),
})

watch(() => [props.initialData, props.defaultMobile], () => {
  form.resetForm({
    values: getFormValues(),
  })
}, { deep: true })

const onSubmit = form.handleSubmit(async (values) => {
  if (isSubmitting.value)
    return
  if (props.requireDetails && !values.songName?.trim()) {
    toast.error('请填写歌曲名称')
    return
  }
  isSubmitting.value = true

  try {
    await $fetch('/api/activities/registrations/register', {
      method: 'POST',
      body: {
        activityCode: props.activityCode,
        mobile: normalizeMobile(values.mobile),
        deviceKey: getOrCreateBrowserDeviceKey(),
        teamName: values.teamName?.trim() || undefined,
        songName: values.songName?.trim() || undefined,
        songDuration: values.songDuration || undefined,
        members: values.members?.trim() || undefined,
      },
    })
    toast.success(props.initialData ? '报名信息已更新' : '报名成功')
    emit('success', normalizeMobile(values.mobile))
  }
  catch (error: any) {
    toast.error(error.statusMessage || error.message || '操作失败')
  }
  finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <form class="space-y-3" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="mobile">
      <FormItem v-if="!props.lockMobile">
        <FormLabel>
          手机号 <span class="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input
            type="tel"
            placeholder="请输入报名手机号"
            v-bind="componentField"
            class="h-10"
            :disabled="props.lockMobile"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
      <FormItem v-else>
        <input type="hidden" v-bind="componentField">
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="teamName">
      <FormItem>
        <FormLabel>
          队伍名称 <span class="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input type="text" placeholder="请输入队伍名称" v-bind="componentField" class="h-10" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="songName">
      <FormItem>
        <FormLabel>
          歌曲名称 <span v-if="props.requireDetails" class="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input type="text" placeholder="请输入歌曲名称" v-bind="componentField" class="h-10" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="songDuration">
      <FormItem>
        <FormLabel>
          歌曲时长（秒）
        </FormLabel>
        <FormControl>
          <Input type="number" inputmode="numeric" min="1" placeholder="例如 210" v-bind="componentField" class="h-10" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="members">
      <FormItem>
        <FormLabel>
          队员名称
        </FormLabel>
        <FormControl>
          <Textarea placeholder="请输入队员名称（可选）" class="resize-none p-3" rows="2" v-bind="componentField" />
        </FormControl>
        <FormDescription>
          多人请用逗号或换行分隔
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="pt-1">
      <Button type="submit" class="h-10 w-full text-base font-medium" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
        {{ isSubmitting ? '提交中...' : (initialData ? '更新报名' : '立即报名') }}
      </Button>
    </div>
  </form>
</template>
