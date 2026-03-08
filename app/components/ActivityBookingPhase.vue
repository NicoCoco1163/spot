<script setup lang="ts">
const props = defineProps<{
  activityId: number
  seats: any[]
  mySeat: any
  myRegistration: any
  currentUserId?: number
  swapMode?: boolean
  swapFromSeatNumber?: number | null
}>()

const emit = defineEmits<{
  seatClick: [seat: any]
  registrationSuccess: []
  registrationEditorOpenChange: [open: boolean]
}>()

const dayjs = useDayjs()
const showEditRegistrationDialog = ref(false)

watch(showEditRegistrationDialog, open => emit('registrationEditorOpenChange', open))

function handleRegistrationSuccess() {
  showEditRegistrationDialog.value = false
  emit('registrationSuccess')
}
</script>

<template>
  <div v-if="props.myRegistration" class="rounded-xl border bg-white p-3 shadow-xs">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 class="text-xs font-semibold tracking-tight text-gray-900">
        报名信息
      </h2>
      <div class="flex items-center gap-1.5">
        <span class="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
          已报名
        </span>
        <Button variant="ghost" size="sm" class="h-6 px-2 text-[11px] text-gray-500 hover:text-gray-800" @click="showEditRegistrationDialog = true">
          修改
        </Button>
      </div>
    </div>
    <div class="grid gap-1.5 text-xs">
      <div v-if="props.myRegistration.song" class="rounded-md bg-gray-50 px-2.5 py-2">
        <span class="text-gray-400 mr-2">歌曲</span><span class="text-gray-700">{{ props.myRegistration.song }}</span>
      </div>
      <div v-if="props.myRegistration.captain" class="rounded-md bg-gray-50 px-2.5 py-2">
        <span class="text-gray-400 mr-2">队长</span><span class="text-gray-700">{{ props.myRegistration.captain }}</span>
      </div>
      <div v-if="props.myRegistration.members" class="rounded-md bg-gray-50 px-2.5 py-2">
        <span class="text-gray-400 mr-2">成员</span><span class="text-gray-700">{{ props.myRegistration.members }}</span>
      </div>
      <div v-if="props.mySeat?.remark" class="rounded-md bg-gray-50 px-2.5 py-2">
        <span class="text-gray-400 mr-2">备注</span><span class="text-gray-700">{{ props.mySeat.remark || '未填写' }}</span>
      </div>
    </div>
  </div>

  <div>
    <h2 class="font-bold text-gray-900 text-lg mb-2 px-1 flex justify-between items-center tracking-tight">
      <span>表演顺序</span>
      <span v-if="props.mySeat" class="bg-black px-3 py-1.5 rounded-md shadow-md shadow-black/10 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span class="text-xs text-white font-mono tabular-nums">我的位次 {{ props.mySeat.seatNumber }}号</span>
      </span>
    </h2>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div
        v-for="seat in props.seats"
        :key="seat.id"
        class="relative"
      >
        <button
          class="w-full h-[88px] rounded-xl flex flex-col justify-between p-2.5 transition-all duration-300 text-left relative overflow-hidden group border"
          :class="[
            seat.isOccupied
              ? (seat.user?.id === props.currentUserId
                ? 'bg-black text-white scale-[1.02] z-10'
                : 'bg-white text-gray-900')
              : 'bg-gray-50/50 border-gray-200/60 border-dashed text-gray-400 hover:border-gray-300 hover:bg-gray-100 active:scale-[0.98]',
            props.swapMode && seat.isOccupied ? 'hover:ring-2 hover:ring-emerald-400/60 cursor-pointer' : '',
            props.swapMode && props.swapFromSeatNumber === seat.seatNumber
              ? (seat.user?.id === props.currentUserId
                ? 'ring-2 ring-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.45)_inset]'
                : 'ring-2 ring-emerald-500 bg-emerald-50 text-emerald-900')
              : '',
          ]"
          @click="emit('seatClick', seat)"
        >
          <div class="flex justify-between items-start w-full">
            <span class="text-base font-bold font-mono tabular-nums transition-opacity leading-none" :class="seat.isOccupied && seat.user?.id === props.currentUserId ? 'text-white/40' : 'opacity-40 group-hover:opacity-60'">{{ seat.seatNumber }}</span>
            <span v-if="seat.isOccupied && seat.occupiedAt" class="text-[10px] font-mono leading-none" :class="seat.user?.id === props.currentUserId ? 'text-white/40' : 'text-gray-400'">
              {{ dayjs(seat.occupiedAt).format('HH:mm') }}
            </span>
          </div>

          <div class="w-full">
            <div class="font-bold truncate tracking-tight leading-none mb-1.5" :class="[seat.isOccupied ? 'text-sm' : 'text-xs', seat.user?.id === props.currentUserId ? 'text-white' : '']">
              {{ seat.isOccupied ? getUserNickname(seat.user) : '虚位以待' }}
            </div>
            <div
              class="text-[10px] h-[16px] font-lighter line-clamp-1 w-full break-all truncate"
              :class="seat.user?.id === props.currentUserId ? 'text-white/70' : 'text-gray-500'"
            >
              {{ seat.remark || (seat.user?.id ? '未填写' : '') }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>

  <Dialog v-model:open="showEditRegistrationDialog">
    <DialogContent class="max-w-[90%] rounded-2xl top-[20%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2 max-h-[85vh] overflow-y-auto" @open-auto-focus.prevent>
      <DialogHeader>
        <DialogTitle>修改报名信息</DialogTitle>
        <DialogDescription>
          抢座阶段可继续修改歌曲、队长和成员信息
        </DialogDescription>
      </DialogHeader>
      <RegistrationForm
        :activity-id="props.activityId"
        :initial-data="props.myRegistration"
        @success="handleRegistrationSuccess"
      />
    </DialogContent>
  </Dialog>
</template>
