<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { fromDate, getLocalTimeZone, toCalendarDate, today } from '@internationalized/date'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
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

const show = ref(false)
const activeTab = ref('date')

// Temp state
const tempDate = ref<DateValue>()
const tempTime = ref({ hour: 0, minute: 0 })

// Init values from modelValue
function initValues() {
  const d = props.modelValue ? dayjs(props.modelValue) : dayjs()
  // Convert JS Date to DateValue (CalendarDate)
  try {
    const zdt = fromDate(d.toDate(), getLocalTimeZone())
    tempDate.value = toCalendarDate(zdt)
  }
  catch {
    // Fallback if date is invalid
    tempDate.value = today(getLocalTimeZone())
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
  const dateObj = tempDate.value.toDate(getLocalTimeZone())

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

// Auto-scroll logic for time picker could be added here,
// but simple click is sufficient for now.
</script>

<template>
  <div>
    <div
      class="flex items-center justify-between border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 transition-colors bg-white"
      @click="open"
    >
      <span :class="displayValue ? 'text-foreground' : 'text-muted-foreground'">
        {{ displayValue || placeholder || '选择时间' }}
      </span>
      <CalendarIcon class="w-4 h-4 opacity-50" />
    </div>

    <Drawer v-model:open="show">
      <DrawerContent>
        <div class="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>选择时间</DrawerTitle>
          </DrawerHeader>

          <div class="px-4">
            <Tabs v-model="activeTab" class="w-full">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="date">
                  日期
                </TabsTrigger>
                <TabsTrigger value="time">
                  时间
                </TabsTrigger>
              </TabsList>

              <TabsContent value="date" class="mt-2">
                <div class="flex justify-center h-[320px] items-start">
                  <Calendar
                    v-model="tempDate"
                    layout="month-and-year"
                    :min-value="props.minDate ? toCalendarDate(fromDate(props.minDate, getLocalTimeZone())) : undefined"
                    :max-value="props.maxDate ? toCalendarDate(fromDate(props.maxDate, getLocalTimeZone())) : undefined"
                  />
                </div>
              </TabsContent>

              <TabsContent value="time" class="mt-2">
                <div class="flex h-[320px] border rounded-md overflow-hidden" data-vaul-no-drag>
                  <!-- Hours -->
                  <div class="flex-1 overflow-y-auto border-r scrollbar-hide text-center bg-white relative" data-vaul-no-drag>
                    <div class="sticky top-0 bg-gray-100 p-2 text-xs font-medium text-gray-500 z-10 border-b">
                      时
                    </div>
                    <div
                      v-for="h in hours"
                      :key="h"
                      class="py-3 px-6 cursor-pointer transition-colors"
                      :class="tempTime.hour === h ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-gray-50'"
                      @click="tempTime.hour = h"
                    >
                      {{ h.toString().padStart(2, '0') }}
                    </div>
                  </div>

                  <!-- Minutes -->
                  <div class="flex-1 overflow-y-auto scrollbar-hide text-center bg-white relative" data-vaul-no-drag>
                    <div class="sticky top-0 bg-gray-100 p-2 text-xs font-medium text-gray-500 z-10 border-b">
                      分
                    </div>
                    <div
                      v-for="m in minutes"
                      :key="m"
                      class="py-3 px-6 cursor-pointer transition-colors"
                      :class="tempTime.minute === m ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-gray-50'"
                      @click="tempTime.minute = m"
                    >
                      {{ m.toString().padStart(2, '0') }}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DrawerFooter class="pt-6">
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
