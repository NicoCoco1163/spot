<script setup lang="ts">
const props = defineProps<{
  activityCode: string
  registrationFormKey: number
  myRegistration: any
  currentMobile?: string
}>()

const emit = defineEmits<{
  success: [mobile: string]
}>()
</script>

<template>
  <Card>
    <CardHeader class="px-3 pb-0 pt-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <CardTitle class="text-base">
            {{ props.myRegistration ? '我的报名信息' : '活动报名' }}
          </CardTitle>
        </div>
        <Badge :variant="props.myRegistration ? 'default' : 'secondary'">
          {{ props.myRegistration ? '已报名' : '可报名' }}
        </Badge>
      </div>
    </CardHeader>
    <CardContent class="px-3 pb-3 pt-0">
      <RegistrationForm
        :key="props.registrationFormKey"
        :activity-code="props.activityCode"
        :initial-data="props.myRegistration"
        :default-mobile="props.currentMobile"
        :lock-mobile="!!props.currentMobile"
        @success="mobile => emit('success', mobile)"
      />
    </CardContent>
  </Card>
</template>
