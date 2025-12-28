<script setup lang="ts">
import { useClipboard, useIntervalFn } from '@vueuse/core'
import { Calendar, Loader2, RefreshCcw, Share2, User } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const dayjs = useDayjs()
const { copy } = useClipboard()

const activityId = route.params.id as string

const { data, refresh, error, pending: isRefreshing } = await useFetch(`/api/activities/user/${activityId}`)

// Auto refresh every 5s
const { pause } = useIntervalFn(() => {
  // Only refresh if not already refreshing and document is visible
  if (!document.hidden) {
    refresh()
  }
}, 5000)

onUnmounted(() => {
  pause()
})

// Handle 404
if (error.value) {
  // We can't use router.push immediately in setup sometimes if SSR, but on client it's fine.
  // Better to just show error state.
}

const activity = computed(() => data.value?.activity)
const seats = computed(() => data.value?.seats || [])

// Check if current user has a seat
const mySeat = computed(() => seats.value.find(s => s.user?.id === authStore.user?.id))

const activityStatus = computed(() => {
  if (!activity.value)
    return null
  const occupiedCount = seats.value.filter(s => s.isOccupied).length
  const isFull = occupiedCount >= activity.value.maxParticipants

  if (activity.value.status === 'cancelled') {
    return {
      class: 'bg-gray-100 text-gray-500 border-gray-200',
      text: '已取消',
      canOperate: false,
    }
  }
  if (activity.value.status === 'completed') {
    return {
      class: 'bg-gray-100 text-gray-500 border-gray-200',
      text: '已结束',
      canOperate: false,
    }
  }
  if (isFull) {
    return {
      class: 'bg-red-50 text-red-500 border-red-100',
      text: '已满',
      canOperate: false, // Technically full, so cannot join. Can release? logic handled separately.
    }
  }
  return {
    class: 'bg-emerald-50 text-emerald-500 border-emerald-100',
    text: '报名中',
    canOperate: true,
  }
})

// Dialogs
const showOccupyDialog = ref(false)
const selectedSeatNumber = ref<number | null>(null)
const remark = ref('')
const isOccupying = ref(false)

const showReleaseDialog = ref(false)
const isReleasing = ref(false)

function handleShare() {
  const url = window.location.href
  copy(url)
  toast.success('链接已复制，快去邀请伙伴吧！')
}

function openOccupy(seat: any) {
  // Check activity status
  if (!activityStatus.value)
    return

  // If cancelled or completed, disallow all interactions
  if (activity.value?.status === 'cancelled' || activity.value?.status === 'completed') {
    toast.error('活动已结束或已取消，无法操作')
    return
  }

  // If Full, check logic
  // "merely [Registration Open] can click to register and release"
  // If text is "已满", user wants to restrict actions?
  // If I strictly follow: if status != '报名中', return.
  // But if I am IN the seat, I should be able to release even if full.
  // However, the user said "merely [Registration Open] can click to register AND release".
  // This implies if it's NOT [Registration Open], I cannot release.
  // This might be what they want.
  // But logic: if I am in seat, and it is full, status is "已满". If I can't release, I am stuck.
  // I will assume "Registration Open" means "Activity is Active".
  // But wait, the badge says "已满".
  // Let's implement a check: if status text is "已满", can I release?
  // I'll allow release if I hold the seat. I'll block occupy if full.

  if (seat.isOccupied) {
    // If occupied by me, ask to release
    if (seat.user?.id === authStore.user?.id) {
      // If activity is cancelled/completed, I already returned.
      // If activity is full, I should be allowed to release to make space.
      showReleaseDialog.value = true
    }
    else {
      // Show info of occupant? Already visible.
      toast.info(`该位置已被 ${getUserNickname(seat.user)} 抢占`)
    }
    return
  }

  // If trying to occupy empty seat
  if (activityStatus.value.text === '已满') {
    toast.warning('活动人数已满，无法报名')
    return
  }

  if (mySeat.value) {
    toast.warning(`您已占用了 ${mySeat.value.seatNumber} 号位次，请先释放`)
    return
  }

  selectedSeatNumber.value = seat.seatNumber
  remark.value = ''
  showOccupyDialog.value = true
}

async function handleOccupy() {
  if (!selectedSeatNumber.value)
    return
  isOccupying.value = true
  try {
    await $fetch('/api/activities/seats/occupy', {
      method: 'POST',
      body: {
        activityId: Number.parseInt(activityId),
        seatNumber: selectedSeatNumber.value,
        remark: remark.value,
      },
    })
    toast.success('抢座成功')
    showOccupyDialog.value = false
    refresh()
  }
  catch (err: any) {
    // 优先显示后端返回的具体错误信息
    const msg = err.data?.message || err.statusMessage || err.message || '抢座失败'
    toast.error(msg)
    // 如果是因为被抢占，最好刷新一下
    if (err.statusCode === 409 || err.statusCode === 400) {
      refresh()
    }
  }
  finally {
    isOccupying.value = false
  }
}

async function handleRelease() {
  if (!mySeat.value)
    return
  isReleasing.value = true
  try {
    await $fetch('/api/activities/seats/release', {
      method: 'POST',
      body: {
        activityId: Number.parseInt(activityId),
        seatNumber: mySeat.value.seatNumber,
      },
    })
    toast.success('已释放位次')
    showReleaseDialog.value = false
    refresh()
  }
  catch (err: any) {
    toast.error(err.statusMessage || err.message || '释放失败')
  }
  finally {
    isReleasing.value = false
  }
}

function goEdit() {
  router.push(`/activities/edit/${activityId}`)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20 relative">
    <!-- Header -->
    <div class="sticky top-0 z-50 bg-[#1c1c1e] text-white backdrop-blur-xl px-5 py-4 flex items-center justify-between shadow-2xl rounded-b-4xl border-b border-white/5 overflow-hidden mb-4">
      <!-- Header Background Decoration -->
      <div class="absolute -right-4 -top-10 h-24 w-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div class="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      <div class="flex items-center gap-3 relative z-10 flex-1 overflow-hidden">
        <Button variant="ghost" size="icon" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full shrink-0 -ml-2 h-8 w-8 transition-all duration-300" @click="router.push('/')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Button>
        <h1 class="font-bold text-xl tracking-wide truncate text-white/90">
          {{ activity?.title || '加载中...' }}
        </h1>
      </div>

      <div class="flex items-center gap-2 relative z-10 shrink-0">
        <Button v-if="authStore.user?.isAdmin" variant="ghost" size="icon" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 transition-all duration-300 active:scale-90" @click="handleShare">
          <Share2 class="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 transition-all duration-300 active:scale-90 active:rotate-180" :disabled="isRefreshing" @click="() => refresh()">
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
        </Button>
        <Button v-if="authStore.user?.isAdmin" variant="ghost" size="sm" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 active:scale-95" @click="goEdit">
          编辑
        </Button>
      </div>
    </div>

    <div v-if="activity" class="p-4 max-w-2xl mx-auto space-y-6">
      <!-- Info Section -->
      <div class="bg-white rounded-2xl p-4 space-y-4">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-500">
            <Calendar class="w-5 h-5" />
          </div>
          <div class="pt-0.5">
            <div class="font-bold text-gray-900 text-lg tracking-tight">
              {{ dayjs(activity.startTime).format('YYYY年MM月DD日') }} <span class="text-sm font-normal text-gray-400 ml-1">{{ dayjs(activity.startTime).format('ddd') }}</span>
            </div>
            <div class="text-gray-500 text-sm mt-0.5 font-medium">
              {{ dayjs(activity.startTime).format('HH:mm') }} - {{ activity.endTime ? dayjs(activity.endTime).format('HH:mm') : '结束时间未定' }}
            </div>
          </div>
        </div>

        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 text-orange-500">
            <User class="w-5 h-5" />
          </div>
          <div class="pt-0.5 w-full">
            <div class="flex justify-between items-center mb-1">
              <div class="font-bold text-gray-900 text-lg tracking-tight">
                {{ seats.filter(s => s.isOccupied).length }} / {{ activity.maxParticipants }} <span class="text-sm font-normal text-gray-400">人</span>
              </div>
              <span
                v-if="activityStatus"
                class="text-xs font-bold px-2 py-0.5 text-[10px] rounded-full border"
                :class="activityStatus.class"
              >
                {{ activityStatus.text }}
              </span>
            </div>
            <!-- Progress Bar -->
            <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="seats.filter(s => s.isOccupied).length >= activity.maxParticipants ? 'bg-red-500' : 'bg-emerald-500'"
                :style="{ width: `${(seats.filter(s => s.isOccupied).length / activity.maxParticipants) * 100}%` }"
              />
            </div>
          </div>
        </div>

        <div v-if="activity.description" class="pt-4 border-t border-gray-100 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
          {{ activity.description || '暂无活动描述' }}
        </div>
      </div>

      <!-- Seats Grid -->
      <div>
        <h2 class="font-bold text-gray-900 text-lg mb-4 px-1 flex justify-between items-center tracking-tight">
          <span>表演顺序</span>
          <span v-if="mySeat" class="bg-black px-3 py-1.5 rounded-md shadow-md shadow-black/10 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span class="text-xs text-white">我的位次 {{ mySeat.seatNumber }}号</span>
          </span>
        </h2>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            v-for="seat in seats"
            :key="seat.id"
            class="relative"
          >
            <button
              class="w-full h-[88px] rounded-xl flex flex-col justify-between p-2.5 transition-all duration-300 text-left relative overflow-hidden group border"
              :class="[
                seat.isOccupied
                  ? (seat.user?.id === authStore.user?.id
                    ? 'bg-black text-white scale-[1.02] z-10'
                    : 'bg-white text-gray-900')
                  : 'bg-gray-50/50 border-gray-200/60 border-dashed text-gray-400 hover:border-gray-300 hover:bg-gray-100 active:scale-[0.98]',
              ]"
              @click="openOccupy(seat)"
            >
              <div class="flex justify-between items-start w-full">
                <span class="text-base font-bold transition-opacity leading-none" :class="seat.isOccupied && seat.user?.id === authStore.user?.id ? 'text-white/40' : 'opacity-40 group-hover:opacity-60'">{{ seat.seatNumber }}</span>
                <span v-if="seat.isOccupied && seat.occupiedAt" class="text-[10px] font-mono leading-none" :class="seat.user?.id === authStore.user?.id ? 'text-white/40' : 'text-gray-400'">
                  {{ dayjs(seat.occupiedAt).format('HH:mm') }}
                </span>
              </div>

              <div class="w-full">
                <div class="font-bold truncate tracking-tight leading-none mb-1.5" :class="[seat.isOccupied ? 'text-sm' : 'text-xs', seat.user?.id === authStore.user?.id ? 'text-white' : '']">
                  {{ seat.isOccupied ? getUserNickname(seat.user) : '虚位以待' }}
                </div>

                <!-- Remark Display -->
                <div
                  class="text-[10px] h-[16px] line-clamp-1 w-full break-all truncate"
                  :class="seat.user?.id === authStore.user?.id ? 'text-white/70' : 'text-gray-500'"
                >
                  {{ seat.remark || '未知' }}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading/Error State -->
    <div v-else-if="error" class="p-8 text-center text-red-500">
      加载失败，请重试
    </div>
    <div v-else class="p-8 text-center text-gray-400">
      <Loader2 class="w-8 h-8 animate-spin mx-auto mb-2" />
      加载中...
    </div>

    <!-- Occupy Dialog -->
    <Dialog v-model:open="showOccupyDialog">
      <DialogContent class="max-w-[90%] rounded-2xl top-[20%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>抢占 {{ selectedSeatNumber }} 号位次</DialogTitle>
          <DialogDescription>
            确认后将为您锁定该位置
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>备注 (可选)</Label>
            <Input
              v-model="remark"
              placeholder="例如：表演的歌曲名称"
              class="h-12"
            />
          </div>
        </div>

        <DialogFooter class="flex-row gap-3 justify-end">
          <Button size="sm" variant="outline" @click="showOccupyDialog = false">
            取消
          </Button>
          <Button size="sm" variant="destructive" :disabled="isOccupying" @click="handleOccupy">
            {{ isOccupying ? '处理中...' : '确认抢占' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Release Dialog -->
    <Dialog v-model:open="showReleaseDialog">
      <DialogContent class="max-w-[90%] rounded-2xl top-[20%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>释放位次</DialogTitle>
          <DialogDescription>
            确定要放弃 {{ mySeat?.seatNumber }} 号位次吗？
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="flex-row gap-3 justify-end mt-4">
          <Button size="sm" variant="outline" @click="showReleaseDialog = false">
            取消
          </Button>
          <Button size="sm" variant="destructive" :disabled="isReleasing" @click="handleRelease">
            {{ isReleasing ? '处理中...' : '确认释放' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
