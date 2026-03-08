<script setup lang="ts">
const props = defineProps<{
  seats: any[]
  mySeat: any
  myRegistration: any
  currentUserId?: number
}>()

const emit = defineEmits<{
  seatClick: [seat: any]
}>()

const dayjs = useDayjs()
</script>

<template>
  <div v-if="props.myRegistration" class="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-1 h-5 bg-emerald-500 rounded-full" />
      <h2 class="font-bold text-gray-900 text-sm">
        报名信息
      </h2>
    </div>
    <div class="text-sm text-gray-600 space-y-1">
      <div v-if="props.myRegistration.song">
        <span class="text-gray-400">歌曲：</span>{{ props.myRegistration.song }}
      </div>
      <div v-if="props.myRegistration.captain">
        <span class="text-gray-400">队长：</span>{{ props.myRegistration.captain }}
      </div>
      <div v-if="props.myRegistration.members">
        <span class="text-gray-400">成员：</span>{{ props.myRegistration.members }}
      </div>
    </div>
  </div>

  <div>
    <h2 class="font-bold text-gray-900 text-lg mb-4 px-1 flex justify-between items-center tracking-tight">
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
              class="text-[10px] h-[16px] line-clamp-1 w-full break-all truncate"
              :class="seat.user?.id === props.currentUserId ? 'text-white/70' : 'text-gray-500'"
            >
              {{ seat.remark || (seat.user?.id ? '未填写' : '') }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
