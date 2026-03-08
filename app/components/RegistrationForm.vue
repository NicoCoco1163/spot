<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Loader2 } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'

const props = defineProps<{
  activityId: number
  initialData?: {
    song?: string | null
    captain?: string | null
    members?: string | null
  } | null
}>()

const emit = defineEmits<{
  success: []
}>()

const isSubmitting = ref(false)

const formSchema = toTypedSchema(z.object({
  song: z.string({ required_error: '请输入表演歌曲' }).trim().min(1, '请输入表演歌曲').max(100, '歌曲名称最多 100 字'),
  captain: z.string({ required_error: '请输入队长姓名' }).trim().min(1, '请输入队长姓名').max(50, '队长姓名最多 50 字'),
  members: z.string().max(500).optional(),
}))

function getFormValues() {
  return {
    song: props.initialData?.song || '',
    captain: props.initialData?.captain || '',
    members: props.initialData?.members || '',
  }
}

const form = useForm({
  validationSchema: formSchema,
  initialValues: getFormValues(),
})

watch(() => props.initialData, () => {
  form.resetForm({
    values: getFormValues(),
  })
}, { deep: true })

const onSubmit = form.handleSubmit(async (values) => {
  if (isSubmitting.value)
    return
  isSubmitting.value = true

  try {
    await $fetch('/api/activities/registrations/register', {
      method: 'POST',
      body: {
        activityId: props.activityId,
        ...values,
      },
    })
    toast.success(props.initialData ? '报名信息已更新' : '报名成功')
    emit('success')
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
  <form class="space-y-4" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="song">
      <FormItem>
        <FormLabel>
          歌曲 <span class="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input type="text" placeholder="请输入表演歌曲" v-bind="componentField" class="h-12" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="captain">
      <FormItem>
        <FormLabel>
          队长 <span class="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input type="text" placeholder="请输入队长姓名" v-bind="componentField" class="h-12" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="members">
      <FormItem>
        <FormLabel>
          成员
        </FormLabel>
        <FormControl>
          <Textarea placeholder="请输入成员名单（多人用逗号分隔）" class="resize-none p-3" rows="3" v-bind="componentField" />
        </FormControl>
        <FormDescription>
          多人请用逗号或换行分隔
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="pt-2">
      <Button type="submit" class="w-full h-12 text-base font-medium" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
        {{ isSubmitting ? '提交中...' : (initialData ? '更新报名' : '立即报名') }}
      </Button>
    </div>
  </form>
</template>
