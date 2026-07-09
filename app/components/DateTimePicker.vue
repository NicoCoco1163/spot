<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { fromDate, getLocalTimeZone, toCalendarDate, today } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const props = defineProps<{
  modelValue?: string | Date
  placeholder?: string
  minDate?: Date
  maxDate?: Date
}>()

const emit = defineEmits(['update:modelValue'])
const dayjs = useDayjs()
const localTimeZone = getLocalTimeZone()

const show = ref(false)
const activeTab = ref('date')

// Temp state
const tempDate = ref<DateValue>()
const tempTime = ref({ hour: 0, minute: 0 })
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const timePresets = [
  { label: '09:00', hour: 9, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '20:00', hour: 20, minute: 0 },
]
const minutePresets = [0, 15, 30, 45]

const quickDateOptions = computed(() => {
  const now = dayjs()
  return [
    { label: '今天', value: now },
    { label: '明天', value: now.add(1, 'day') },
    { label: '后天', value: now.add(2, 'day') },
  ]
})

// Init values from modelValue
function initValues() {
  const d = props.modelValue ? dayjs(props.modelValue) : dayjs()
  // Convert JS Date to DateValue (CalendarDate)
  try {
    const zdt = fromDate(d.toDate(), localTimeZone)
    tempDate.value = toCalendarDate(zdt)
  }
  catch {
    // Fallback if date is invalid
    tempDate.value = today(localTimeZone)
  }

  tempTime.value = {
    hour: d.hour(),
    minute: d.minute(),
  }
}

watch(() => props.modelValue, initValues, { immediate: true })

const displayValue = computed(() => {
  if (!props.modelValue)
    return ''
  return dayjs(props.modelValue).format('YYYY-MM-DD HH:mm')
})

const selectedDate = computed(() => {
  if (!tempDate.value)
    return null
  return dayjs(tempDate.value.toDate(localTimeZone))
})

const selectedDateText = computed(() => {
  if (!selectedDate.value)
    return '未选择日期'
  return `${selectedDate.value.format('YYYY-MM-DD')} ${weekDays[selectedDate.value.day()]}`
})

const selectedTimeText = computed(() => {
  return `${String(tempTime.value.hour).padStart(2, '0')}:${String(tempTime.value.minute).padStart(2, '0')}`
})

function open() {
  initValues()
  show.value = true
}

function onConfirm() {
  if (!tempDate.value) {
    show.value = false
    return
  }

  // Combine date and time
  // tempDate is CalendarDate. toDate(timezone) gives JS Date at start of day in that timezone.
  const dateObj = tempDate.value.toDate(localTimeZone)

  // Set time
  dateObj.setHours(tempTime.value.hour)
  dateObj.setMinutes(tempTime.value.minute)

  // Emit ISO string
  emit('update:modelValue', dateObj.toISOString())
  show.value = false
}

// Time picker helpers
const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 }, (_, i) => i)

function toDateValue(value: Date | string) {
  return toCalendarDate(fromDate(dayjs(value).toDate(), localTimeZone))
}

function isDateDisabled(value: Date | string) {
  const date = dayjs(value)
  if (props.minDate && date.isBefore(dayjs(props.minDate), 'day'))
    return true
  if (props.maxDate && date.isAfter(dayjs(props.maxDate), 'day'))
    return true
  return false
}

function isSelectedDate(value: Date | string) {
  return !!selectedDate.value && selectedDate.value.isSame(dayjs(value), 'day')
}

function selectDate(value: Date | string) {
  if (isDateDisabled(value))
    return
  tempDate.value = toDateValue(value)
}

function selectTime(hour: number, minute = tempTime.value.minute) {
  tempTime.value = { hour, minute }
}

function selectMinute(minute: number) {
  tempTime.value = { ...tempTime.value, minute }
}
</script>

<template>
  <div>
    <div
      class="flex items-center border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors bg-white"
      @click="open"
    >
      <span class="font-mono tabular-nums" :class="displayValue ? 'text-foreground' : 'text-muted-foreground'">
        {{ displayValue || placeholder || '选择时间' }}
      </span>
    </div>

    <Drawer v-model:open="show">
      <DrawerContent class="date-time-drawer overflow-hidden">
        <div class="date-time-drawer-panel mx-auto flex w-full max-w-sm flex-col overflow-hidden">
          <DrawerHeader class="shrink-0 pb-2">
            <DrawerTitle>报名截止时间</DrawerTitle>
            <div class="mt-1 rounded-md bg-muted/60 px-3 py-2 text-sm">
              <div class="font-medium">{{ selectedDateText }}</div>
              <div class="font-mono text-muted-foreground">{{ selectedTimeText }}</div>
            </div>
          </DrawerHeader>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 scrollbar-hide" data-vaul-no-drag>
            <Tabs v-model="activeTab" class="flex min-h-full w-full flex-col">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="date">
                  日期
                </TabsTrigger>
                <TabsTrigger value="time">
                  时间
                </TabsTrigger>
              </TabsList>

              <TabsContent value="date" class="mt-3 space-y-3">
                <div class="grid grid-cols-3 gap-2">
                  <Button
                    v-for="item in quickDateOptions"
                    :key="item.label"
                    type="button"
                    size="sm"
                    :variant="isSelectedDate(item.value.toDate()) ? 'default' : 'outline'"
                    class="h-8"
                    :disabled="isDateDisabled(item.value.toDate())"
                    @click="selectDate(item.value.toDate())"
                  >
                    {{ item.label }}
                  </Button>
                </div>

                <div class="date-panel flex items-stretch justify-center overflow-hidden rounded-md border" data-vaul-no-drag>
                  <Calendar
                    v-model="tempDate"
                    class="date-calendar h-full w-full"
                    layout="month-and-year"
                    :min-value="props.minDate ? toCalendarDate(fromDate(props.minDate, localTimeZone)) : undefined"
                    :max-value="props.maxDate ? toCalendarDate(fromDate(props.maxDate, localTimeZone)) : undefined"
                  />
                </div>

                <Button type="button" variant="outline" class="h-9 w-full" @click="activeTab = 'time'">
                  继续选择时间
                </Button>
              </TabsContent>

              <TabsContent value="time" class="mt-3 space-y-3">
                <div class="grid grid-cols-4 gap-2">
                  <Button
                    v-for="item in timePresets"
                    :key="item.label"
                    type="button"
                    size="sm"
                    :variant="tempTime.hour === item.hour && tempTime.minute === item.minute ? 'default' : 'outline'"
                    class="h-8 font-mono"
                    @click="selectTime(item.hour, item.minute)"
                  >
                    {{ item.label }}
                  </Button>
                </div>

                <div class="grid grid-cols-4 gap-2">
                  <Button
                    v-for="minute in minutePresets"
                    :key="minute"
                    type="button"
                    size="sm"
                    :variant="tempTime.minute === minute ? 'default' : 'outline'"
                    class="h-8 font-mono"
                    @click="selectMinute(minute)"
                  >
                    {{ minute.toString().padStart(2, '0') }}分
                  </Button>
                </div>

                <div class="time-panel flex overflow-hidden rounded-md border" data-vaul-no-drag>
                  <div class="relative flex-1 overflow-y-auto border-r bg-white text-center scrollbar-hide" data-vaul-no-drag>
                    <div class="sticky top-0 z-10 border-b bg-muted p-2 font-mono text-xs font-medium text-muted-foreground">
                      时
                    </div>
                    <div
                      v-for="h in hours"
                      :key="h"
                      class="cursor-pointer px-6 py-2.5 font-mono tabular-nums transition-colors"
                      :class="tempTime.hour === h ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted/60'"
                      @click="selectTime(h)"
                    >
                      {{ h.toString().padStart(2, '0') }}
                    </div>
                  </div>

                  <div class="relative flex-1 overflow-y-auto bg-white text-center scrollbar-hide" data-vaul-no-drag>
                    <div class="sticky top-0 z-10 border-b bg-muted p-2 font-mono text-xs font-medium text-muted-foreground">
                      分
                    </div>
                    <div
                      v-for="m in minutes"
                      :key="m"
                      class="cursor-pointer px-6 py-2.5 font-mono tabular-nums transition-colors"
                      :class="tempTime.minute === m ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted/60'"
                      @click="selectMinute(m)"
                    >
                      {{ m.toString().padStart(2, '0') }}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DrawerFooter class="shrink-0 border-t bg-background p-4 pb-[calc(1rem+var(--safe-area-bottom))]">
            <Button @click="onConfirm">
              确认
            </Button>
            <DrawerClose as-child>
              <Button variant="outline">
                取消
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  </div>
</template>

<style scoped>
.date-time-drawer,
.date-time-drawer-panel {
  max-height: calc(100vh - 1rem);
  max-height: calc(100svh - 1rem);
}

.date-panel {
  height: clamp(250px, 42vh, 292px);
  height: clamp(250px, 42svh, 292px);
}

.time-panel {
  height: clamp(210px, 36vh, 252px);
  height: clamp(210px, 36svh, 252px);
}

.date-panel :deep([data-slot='calendar']) {
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: column;
  padding: 0.75rem 0.75rem 0.5rem;
}

.date-panel :deep([data-slot='calendar-grid']) {
  width: 100%;
}

.date-panel :deep([data-slot='calendar-grid-row']) {
  width: 100%;
}

.date-panel :deep([data-slot='calendar-cell']) {
  flex: 1;
}

.date-panel :deep([data-slot='calendar-cell']:has([data-selected])) {
  background-color: transparent;
}

.date-panel :deep([data-slot='calendar-cell-trigger']) {
  margin-left: auto;
  margin-right: auto;
}
</style>
