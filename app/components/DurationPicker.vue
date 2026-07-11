<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

const props = defineProps<{
  modelValue?: number | null
  placeholder?: string
  maxMinute?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const show = ref(false)

// Temp state (minute / second)
const tempMinute = ref(0)
const tempSecond = ref(0)

// 常见歌曲时长快捷预设
const durationPresets = [
  { label: '3:00', seconds: 180 },
  { label: '3:30', seconds: 210 },
  { label: '4:00', seconds: 240 },
  { label: '4:30', seconds: 270 },
]

const maxMinute = computed(() => props.maxMinute ?? 20)
const minutes = computed(() => Array.from({ length: maxMinute.value + 1 }, (_, i) => i))
const seconds = Array.from({ length: 60 }, (_, i) => i)

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function fromSeconds(total: number) {
  return {
    minute: Math.floor(total / 60),
    second: total % 60,
  }
}

function initValues() {
  const total = Number(props.modelValue)
  if (Number.isFinite(total) && total > 0) {
    const { minute, second } = fromSeconds(total)
    tempMinute.value = Math.min(minute, maxMinute.value)
    tempSecond.value = second
  }
  else {
    tempMinute.value = 0
    tempSecond.value = 0
  }
}

watch(() => props.modelValue, initValues, { immediate: true })

const displayValue = computed(() => {
  const total = Number(props.modelValue)
  if (!Number.isFinite(total) || total <= 0)
    return ''
  const { minute, second } = fromSeconds(total)
  return `${pad(minute)}:${pad(second)}`
})

const selectedText = computed(() => `${pad(tempMinute.value)}:${pad(tempSecond.value)}`)
const totalSeconds = computed(() => tempMinute.value * 60 + tempSecond.value)

function open() {
  initValues()
  show.value = true
}

function selectPreset(preset: { seconds: number }) {
  const { minute, second } = fromSeconds(preset.seconds)
  tempMinute.value = minute
  tempSecond.value = second
}

function isPresetActive(preset: { seconds: number }) {
  return totalSeconds.value === preset.seconds
}

function onConfirm() {
  emit('update:modelValue', totalSeconds.value > 0 ? totalSeconds.value : undefined)
  show.value = false
}

function onClear() {
  tempMinute.value = 0
  tempSecond.value = 0
  emit('update:modelValue', undefined)
  show.value = false
}
</script>

<template>
  <div>
    <div
      class="flex h-8 items-center border rounded-md px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors bg-white"
      @click="open"
    >
      <span class="font-mono tabular-nums" :class="displayValue ? 'text-foreground' : 'text-muted-foreground'">
        {{ displayValue || placeholder || '选择时长' }}
      </span>
    </div>

    <Drawer v-model:open="show">
      <DrawerContent class="duration-drawer overflow-hidden">
        <div class="duration-drawer-panel mx-auto flex w-full max-w-sm flex-col overflow-hidden">
          <DrawerHeader class="shrink-0 pb-2">
            <DrawerTitle>歌曲时长</DrawerTitle>
            <div class="mt-1 rounded-md bg-muted/60 px-3 py-2 text-sm">
              <div class="font-mono text-lg font-medium tabular-nums">{{ selectedText }}</div>
              <div class="text-xs text-muted-foreground">分 : 秒</div>
            </div>
          </DrawerHeader>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 scrollbar-hide" data-vaul-no-drag>
            <div class="space-y-3">
              <div class="grid grid-cols-4 gap-2">
                <Button
                  v-for="item in durationPresets"
                  :key="item.label"
                  type="button"
                  size="sm"
                  :variant="isPresetActive(item) ? 'default' : 'outline'"
                  class="h-8 font-mono"
                  @click="selectPreset(item)"
                >
                  {{ item.label }}
                </Button>
              </div>

              <div class="duration-panel flex overflow-hidden rounded-md border" data-vaul-no-drag>
                <div class="relative flex-1 overflow-y-auto border-r bg-white text-center scrollbar-hide" data-vaul-no-drag>
                  <div class="sticky top-0 z-10 border-b bg-muted p-2 font-mono text-xs font-medium text-muted-foreground">
                    分
                  </div>
                  <div
                    v-for="m in minutes"
                    :key="m"
                    class="cursor-pointer px-6 py-2.5 font-mono tabular-nums transition-colors"
                    :class="tempMinute === m ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted/60'"
                    @click="tempMinute = m"
                  >
                    {{ m.toString().padStart(2, '0') }}
                  </div>
                </div>

                <div class="relative flex-1 overflow-y-auto bg-white text-center scrollbar-hide" data-vaul-no-drag>
                  <div class="sticky top-0 z-10 border-b bg-muted p-2 font-mono text-xs font-medium text-muted-foreground">
                    秒
                  </div>
                  <div
                    v-for="s in seconds"
                    :key="s"
                    class="cursor-pointer px-6 py-2.5 font-mono tabular-nums transition-colors"
                    :class="tempSecond === s ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted/60'"
                    @click="tempSecond = s"
                  >
                    {{ s.toString().padStart(2, '0') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DrawerFooter class="shrink-0 border-t bg-background p-4 pb-[calc(1rem+var(--safe-area-bottom))]">
            <Button @click="onConfirm">
              确认
            </Button>
            <div class="grid grid-cols-2 gap-2">
              <Button variant="outline" @click="onClear">
                清空
              </Button>
              <DrawerClose as-child>
                <Button variant="outline">
                  取消
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  </div>
</template>

<style scoped>
.duration-drawer,
.duration-drawer-panel {
  max-height: calc(100vh - 1rem);
  max-height: calc(100svh - 1rem);
}

.duration-panel {
  height: clamp(210px, 36vh, 252px);
  height: clamp(210px, 36svh, 252px);
}
</style>
