<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { ArrowLeft, Loader2 } from '@lucide/vue'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'

definePageMeta({
  middleware: 'admin',
})

const router = useRouter()

const formSchema = toTypedSchema(z.object({
  title: z.string({ required_error: '请输入标题' }).min(1, '请输入标题'),
  description: z.string().optional(),
  deadline: z.string({ required_error: '请选择报名截止时间' }).min(1, '请选择报名截止时间'),
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
        deadline: new Date(values.deadline),
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
  <div class="min-h-screen bg-muted/30 pb-8">
    <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div class="mx-auto flex w-full max-w-full items-center gap-2 px-3 py-2">
        <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" @click="router.back()">
          <ArrowLeft class="h-4 w-4" />
          <span class="sr-only">返回</span>
        </Button>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-base font-semibold leading-6">创建新活动</h1>
          <p class="truncate text-xs text-muted-foreground">
            设置报名截止时间后即可发布
          </p>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-full space-y-3 p-3">
      <div class="rounded-lg border bg-background">
        <div class="border-b p-3">
          <h2 class="text-base font-semibold leading-6">活动信息</h2>
          <p class="text-sm text-muted-foreground">
            游客通过活动链接访问详情页，报名截止后进入抢位阶段。
          </p>
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

          <div class="pt-2">
            <Button type="submit" class="h-8 w-full" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isSubmitting ? '创建中' : '创建活动' }}
            </Button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
