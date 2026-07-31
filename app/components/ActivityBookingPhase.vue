<script setup lang="ts">
const props = defineProps<{
  activityCode: string
  seats: any[]
  mySeat: any
  myRegistration: any
  currentMobile?: string
  swapMode?: boolean
  swapFromSeatNumber?: number | null
  adminMode?: boolean
}>()

const emit = defineEmits<{
  seatClick: [seat: any]
  registrationSuccess: [mobile: string]
  registrationEditorOpenChange: [open: boolean]
  release: []
}>()

const dayjs = useDayjs()
const showEditRegistrationDialog = ref(false)
const needsRequiredDetails = computed(() => {
  return !props.myRegistration?.teamName?.trim() || !props.myRegistration?.songName?.trim()
})

watch(showEditRegistrationDialog, open => emit('registrationEditorOpenChange', open))

function formatDuration(seconds: unknown) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0)
    return ''
  const m = Math.floor(value / 60)
  const s = value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function handleRegistrationSuccess(mobile: string) {
  showEditRegistrationDialog.value = false
  emit('registrationSuccess', mobile)
}
</script>

<template>
  <Card v-if="!props.adminMode && props.myRegistration">
    <CardHeader class="px-3 pt-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <CardTitle class="text-base">
            占位资格
          </CardTitle>
        </div>
        <Badge v-if="props.myRegistration" :variant="needsRequiredDetails ? 'secondary' : 'default'">
          {{ needsRequiredDetails ? '待补资料' : '可占位' }}
        </Badge>
      </div>
    </CardHeader>
    <CardContent class="space-y-2 px-3 pb-3 text-sm">
      <div class="min-w-0 rounded-md bg-muted/50 px-2 py-2">
        <div class="flex min-w-0 items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate font-medium">
              {{ props.myRegistration.teamName || '未填写队伍名称' }}
            </div>
            <div class="mt-0.5 truncate text-xs text-muted-foreground">
              {{ props.myRegistration.songName || '未填写歌曲名称' }}
            </div>
          </div>
          <div v-if="props.mySeat" class="shrink-0 rounded-md bg-background px-2 py-1 text-xs font-medium">
            {{ props.mySeat.seatNumber }} 号
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" class="h-8 w-full" @click="showEditRegistrationDialog = true">
        {{ needsRequiredDetails ? '补齐占位资料' : '修改报名资料' }}
      </Button>
      <Button
        v-if="props.mySeat"
        variant="destructive"
        size="sm"
        class="h-8 w-full"
        @click="emit('release')"
      >
        取消抢占（{{ props.mySeat.seatNumber }} 号）
      </Button>
    </CardContent>
  </Card>
  <div v-else-if="!props.adminMode" class="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
    <Badge variant="destructive" class="shrink-0">
      未报名
    </Badge>
    <p class="min-w-0 truncate text-muted-foreground">
      当前手机号未报名，不能占位
    </p>
  </div>

  <div>
    <h2 class="mb-2 flex items-center justify-between gap-2 px-1 text-base font-semibold tracking-tight text-foreground">
      <span>表演顺序</span>
      <Badge v-if="!props.adminMode && props.mySeat" variant="secondary" class="shrink-0">
        我的位次 {{ props.mySeat.seatNumber }} 号
      </Badge>
    </h2>

    <div class="grid grid-cols-3 gap-1.5">
      <div
        v-for="seat in props.seats"
        :key="seat.id"
        class="relative"
      >
        <button
          class="group relative flex h-[72px] w-full flex-col justify-between overflow-hidden rounded-md border p-2 text-left"
          :class="[
            seat.isOccupied
              ? (!props.adminMode && seat.mobile === props.currentMobile
                ? 'bg-primary text-primary-foreground z-10'
                : 'bg-background text-foreground')
              : 'bg-gray-50/50 border-gray-200/60 border-dashed text-gray-500 hover:border-gray-300 hover:bg-gray-100',
            props.swapMode && seat.isOccupied ? 'hover:ring-2 hover:ring-emerald-400/60 cursor-pointer' : '',
            props.swapMode && props.swapFromSeatNumber === seat.seatNumber
              ? (!props.adminMode && seat.mobile === props.currentMobile
                ? 'ring-2 ring-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.45)_inset]'
                : 'ring-2 ring-emerald-500 bg-emerald-50 text-emerald-900')
              : '',
          ]"
          @click="emit('seatClick', seat)"
        >
          <div class="flex w-full items-start justify-between">
            <span class="font-mono text-sm font-bold leading-none tabular-nums transition-opacity" :class="seat.isOccupied && !props.adminMode && seat.mobile === props.currentMobile ? 'text-white/40' : 'opacity-40 group-hover:opacity-60'">{{ seat.seatNumber }}</span>
            <!-- <span v-if="seat.isOccupied && seat.occupiedAt" class="text-[10px] font-mono leading-none" :class="!props.adminMode && seat.mobile === props.currentMobile ? 'text-white/40' : 'text-gray-400'">
              {{ dayjs(seat.occupiedAt).format('HH:mm') }}
            </span> -->
          </div>

          <div class="w-full min-w-0">
            <div class="mb-1 truncate text-xs font-bold leading-none tracking-tight" :class="!props.adminMode && seat.mobile === props.currentMobile ? 'text-white' : ''">
              {{ seat.isOccupied ? (seat.registration?.teamName || `尾号${seat.mobile?.slice(-4)}`) : '可占位' }}
            </div>
            <div
              class="h-[14px] w-full truncate break-all text-[10px] leading-none"
              :class="!props.adminMode && seat.mobile === props.currentMobile ? 'text-white/70' : 'text-gray-500'"
            >
              {{ seat.registration?.songName || seat.remark || (seat.mobile ? '未填写' : '') }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>

  <Dialog v-if="!props.adminMode" v-model:open="showEditRegistrationDialog">
    <DialogScrollContent class="max-w-[calc(100%-1.5rem)]" @open-auto-focus.prevent>
      <DialogHeader>
        <DialogTitle>修改报名信息</DialogTitle>
        <DialogDescription>
          占位阶段手机号不可修改，歌曲名称为占位必填
        </DialogDescription>
      </DialogHeader>
      <RegistrationForm
        :activity-code="props.activityCode"
        :initial-data="props.myRegistration"
        lock-mobile
        require-details
        @success="handleRegistrationSuccess"
      />
    </DialogScrollContent>
  </Dialog>
</template>
