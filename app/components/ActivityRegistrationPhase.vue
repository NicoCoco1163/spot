<script setup lang="ts">
const props = defineProps<{
  activityId: number
  registrationFormKey: number
  myRegistration: any
}>()

const emit = defineEmits<{
  success: []
}>()
</script>

<template>
  <div class="rounded-xl border bg-card p-4 text-card-foreground shadow-xs">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-lg font-semibold tracking-tight">
        {{ props.myRegistration ? '我的报名信息' : '立即报名' }}
      </h2>
      <span
        class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium"
        :class="props.myRegistration ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : 'border-primary/20 bg-primary/10 text-primary'"
      >
        {{ props.myRegistration ? '可修改' : '新报名' }}
      </span>
    </div>
    <RegistrationForm
      :key="props.registrationFormKey"
      :activity-id="props.activityId"
      :initial-data="props.myRegistration"
      @success="emit('success')"
    />
  </div>
</template>
