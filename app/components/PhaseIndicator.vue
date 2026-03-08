<script setup lang="ts">
import { AlarmClock } from 'lucide-vue-next'

const props = defineProps<{
  phase: 'registration' | 'booking'
  registrationDeadline?: Date | string | null
  registrationCount?: number
  compact?: boolean
}>()

const dayjs = useDayjs()

const formattedDeadline = computed(() => {
  if (!props.registrationDeadline)
    return null
  return dayjs(props.registrationDeadline).format('MM月DD日 HH:mm')
})

// 倒计时数据
const timeData = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  total: 0,
})
let timer: ReturnType<typeof setInterval> | null = null

function updateTimeRemaining() {
  if (!props.registrationDeadline) {
    timeData.value = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
    return
  }

  const deadline = new Date(props.registrationDeadline).getTime()
  const now = Date.now()
  const diff = deadline - now

  if (diff <= 0) {
    timeData.value = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
    return
  }

  timeData.value = {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    total: diff,
  }
}

// 紧急程度判断
const urgencyLevel = computed(() => {
  const { total, hours, days } = timeData.value
  if (total <= 0)
    return 'expired'
  if (hours < 1 && days === 0)
    return 'critical' // 1小时内
  if (hours < 24 && days === 0)
    return 'urgent' // 24小时内
  return 'normal'
})

const urgencyStyles = computed(() => {
  switch (urgencyLevel.value) {
    case 'critical':
      return {
        surface: 'bg-red-500/8 border-red-500/30',
        text: 'text-red-600',
        badge: 'bg-red-500/12 text-red-700 border-red-500/30',
        hint: '报名将在 1 小时内截止',
      }
    case 'urgent':
      return {
        surface: 'bg-amber-500/8 border-amber-500/30',
        text: 'text-amber-600',
        badge: 'bg-amber-500/12 text-amber-700 border-amber-500/30',
        hint: '报名将在今天截止',
      }
    default:
      return {
        surface: 'bg-emerald-500/8 border-emerald-500/30',
        text: 'text-emerald-700',
        badge: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30',
        hint: '仍有充足时间完成报名',
      }
  }
})

const isExpired = computed(() => urgencyLevel.value === 'expired')
const countdownItems = computed(() => [
  { label: '天', value: timeData.value.days.toString() },
  { label: '时', value: padZero(timeData.value.hours) },
  { label: '分', value: padZero(timeData.value.minutes) },
  { label: '秒', value: padZero(timeData.value.seconds) },
])

function padZero(num: number): string {
  return num.toString().padStart(2, '0')
}

onMounted(() => {
  updateTimeRemaining()
  timer = setInterval(updateTimeRemaining, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

watch(() => props.registrationDeadline, updateTimeRemaining)
</script>

<template>
  <div v-if="compact" class="flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <AlarmClock class="w-4 h-4" :class="urgencyStyles.text" />
      <span class="font-mono tabular-nums">截止：{{ formattedDeadline }}</span>
    </div>
    <div
      v-if="!isExpired"
      class="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold font-mono tabular-nums"
      :class="[urgencyStyles.surface, urgencyStyles.text]"
    >
      <span>{{ timeData.days }}</span>
      <span class="text-muted-foreground/80">天</span>
      <span>:</span>
      <span>{{ padZero(timeData.hours) }}</span>
      <span>:</span>
      <span>{{ padZero(timeData.minutes) }}</span>
      <span>:</span>
      <span>{{ padZero(timeData.seconds) }}</span>
    </div>
    <span v-else class="text-sm font-medium text-red-600">已截止</span>
  </div>

  <div v-else-if="phase === 'registration' && formattedDeadline" class="rounded-xl border bg-card p-4 text-card-foreground shadow-xs">
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <AlarmClock class="h-4 w-4" />
          <span>报名截止时间</span>
        </div>
        <p class="text-lg font-semibold tracking-tight font-mono tabular-nums">
          {{ formattedDeadline }}
        </p>
      </div>
      <span
        class="inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-medium"
        :class="isExpired ? 'bg-red-500/12 text-red-700 border-red-500/30' : urgencyStyles.badge"
      >
        {{ isExpired ? '已截止' : '报名进行中' }}
      </span>
    </div>

    <div
      v-if="!isExpired"
      class="mt-4 rounded-lg border p-3"
      :class="urgencyStyles.surface"
    >
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="item in countdownItems"
          :key="item.label"
          class="rounded-md border border-border/60 bg-background/90 px-2 py-2 text-center"
        >
          <div class="text-2xl font-bold leading-none font-mono tabular-nums tracking-tight" :class="urgencyStyles.text">
            {{ item.value }}
          </div>
          <div class="mt-1 text-[11px] text-muted-foreground">
            {{ item.label }}
          </div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="mt-4 flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-3 text-red-700"
    >
      <AlarmClock class="w-4 h-4" />
      <span class="font-medium">报名已截止</span>
    </div>

    <p v-if="!isExpired" class="mt-3 text-center text-xs" :class="urgencyStyles.text">
      {{ urgencyStyles.hint }}
    </p>
  </div>
</template>
