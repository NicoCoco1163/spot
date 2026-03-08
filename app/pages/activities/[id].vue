<script setup lang="ts">
import { useClipboard, useIntervalFn } from '@vueuse/core'
import { Calendar, ClipboardList, Loader2, RefreshCcw, Share2, User, Users } from 'lucide-vue-next'
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
const phase = computed(() => data.value?.phase || 'registration')
const registrationCount = computed(() => data.value?.registrationCount || 0)
const myRegistration = computed(() => data.value?.myRegistration)

// Check if current user has a seat
const mySeat = computed(() => seats.value.find(s => s.user?.id === authStore.user?.id))

// Computed max participants (seats count for booking phase)
const maxParticipants = computed(() => {
  if (phase.value === 'booking') {
    return seats.value.length || registrationCount.value
  }
  return registrationCount.value
})

const activityStatus = computed(() => {
  if (!activity.value)
    return null
  const occupiedCount = seats.value.filter(s => s.isOccupied).length
  const isFull = occupiedCount >= maxParticipants.value

  if (activity.value.status === 'cancelled') {
    return {
      class: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
      text: '已取消',
      canOperate: false,
    }
  }
  if (activity.value.status === 'completed') {
    return {
      class: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
      text: '已结束',
      canOperate: false,
    }
  }
  // 报名中和抢座中状态已在第一个 Badge 中显示，这里不再重复
  if (isFull) {
    return {
      class: 'bg-red-500/15 text-red-400 border-red-500/25',
      text: '已满',
      canOperate: false,
    }
  }
  return null
})

// Dialogs
const showOccupyDialog = ref(false)
const selectedSeatNumber = ref<number | null>(null)
const remark = ref('')
const isOccupying = ref(false)

const showReleaseDialog = ref(false)
const isReleasing = ref(false)

const showManageDialog = ref(false)
const isUpdating = ref(false)
const manageRemark = ref('')

// Registration refresh
const registrationFormKey = ref(0)
function onRegistrationSuccess() {
  refresh()
  registrationFormKey.value++
}

function openManage(seat: any) {
  if (!seat.isOccupied || seat.user?.id !== authStore.user?.id)
    return

  // 检查活动状态，如果是已取消或已结束，不允许修改
  if (activity.value?.status === 'cancelled' || activity.value?.status === 'completed') {
    toast.error('活动已结束或已取消，无法操作')
    return
  }

  manageRemark.value = seat.remark || ''
  showManageDialog.value = true
}

async function handleUpdateRemark() {
  if (!mySeat.value)
    return

  isUpdating.value = true
  try {
    await $fetch('/api/activities/seats/update-remark', {
      method: 'POST',
      body: {
        activityId: Number.parseInt(activityId),
        seatNumber: mySeat.value.seatNumber,
        remark: manageRemark.value,
      },
    })
    toast.success('备注已更新')
    showManageDialog.value = false
    refresh()
  }
  catch (err: any) {
    const msg = err.data?.message || err.statusMessage || err.message || '更新失败'
    toast.error(msg)
  }
  finally {
    isUpdating.value = false
  }
}

function handleShare() {
  const url = window.location.href
  copy(url)
  toast.success('链接已复制，快去邀请伙伴吧！')
}

function handleCopyCSV() {
  if (!seats.value || seats.value.length === 0) {
    toast.warning('暂无数据')
    return
  }

  // Filter occupied seats
  const occupiedSeats = seats.value.filter(s => s.isOccupied && s.user)

  if (occupiedSeats.length === 0) {
    toast.warning('暂无报名数据')
    return
  }

  // Generate CSV content
  const header = '序号,用户名,昵称,备注\n'
  const rows = occupiedSeats
    .sort((a, b) => a.seatNumber - b.seatNumber)
    .map((s) => {
      // @ts-expect-error username property exists on user object
      const username = s.user?.username || ''
      const nickname = s.user?.nickname || ''
      // Escape commas in remark
      const remark = (s.remark || '').replace(/,/g, '，').replace(/\n/g, ' ')
      return `${s.seatNumber},${username},${nickname},${remark}`
    })
    .join('\n')

  const csvContent = header + rows
  copy(csvContent)
  toast.success('表演顺序已复制到剪贴板 (CSV格式)')
}

function openOccupy(seat: any) {
  // If cancelled or completed, disallow all interactions
  if (activity.value?.status === 'cancelled' || activity.value?.status === 'completed') {
    toast.error('活动已结束或已取消，无法操作')
    return
  }

  if (seat.isOccupied) {
    // If occupied by me, ask to release
    if (seat.user?.id === authStore.user?.id) {
      openManage(seat)
    }
    else {
      // Show info of occupant
      toast.info(`该位置已被 ${getUserNickname(seat.user)} 抢占`)
    }
    return
  }

  if (activityStatus.value?.text === '已满') {
    toast.warning('活动人数已满，无法报名')
    return
  }

  if (mySeat.value) {
    toast.warning(`您已占用了 ${mySeat.value.seatNumber} 号位次，请先释放`)
    return
  }

  selectedSeatNumber.value = seat.seatNumber
  // Pre-fill remark with registration info
  if (myRegistration.value) {
    const parts = []
    if (myRegistration.value.song)
      parts.push(myRegistration.value.song)
    if (myRegistration.value.captain)
      parts.push(`队长: ${myRegistration.value.captain}`)
    if (myRegistration.value.members)
      parts.push(myRegistration.value.members)
    remark.value = parts.join(' | ')
  }
  else {
    remark.value = ''
  }
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
  <div class="min-h-screen bg-gray-50 pb-12 relative">
    <!-- Header -->
    <div class="sticky top-0 z-50 bg-[#1c1c1e] text-white backdrop-blur-xl px-5 py-4 flex items-center justify-between shadow-2xl rounded-b-4xl border-b border-white/5 overflow-hidden">
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
        <Button v-if="authStore.user?.isAdmin && phase === 'booking'" variant="ghost" size="icon" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 transition-all duration-300 active:scale-90" @click="handleCopyCSV">
          <ClipboardList class="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 transition-all duration-300 active:scale-90 active:rotate-180" :disabled="isRefreshing" @click="() => refresh()">
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
        </Button>
        <Button v-if="authStore.user?.isAdmin" variant="ghost" size="sm" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 active:scale-95" @click="goEdit">
          编辑
        </Button>
      </div>
    </div>

    <div v-if="activity" class="p-4 max-w-2xl mx-auto space-y-4">
      <!-- Activity Hero Card -->
      <div class="relative overflow-hidden rounded-2xl bg-[#1c1c1e] text-white shadow-lg">
        <!-- Background Decoration -->
        <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div class="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div class="relative z-10 p-4">
          <!-- Phase & Status Row -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Badge
                class="border px-2.5 py-1 text-[11px] font-semibold shadow-sm"
                :class="phase === 'registration'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                  : 'bg-orange-500/15 text-orange-400 border-orange-500/25'"
              >
                {{ phase === 'registration' ? '报名中' : '抢座中' }}
              </Badge>
              <Badge
                v-if="activityStatus"
                class="border px-2.5 py-1 text-[11px] font-semibold shadow-sm"
                :class="activityStatus.class"
              >
                {{ activityStatus.text }}
              </Badge>
            </div>
            <div class="flex items-center gap-1.5 text-white/50">
              <Users class="w-4 h-4" />
              <span class="text-sm font-medium font-mono tabular-nums">{{ registrationCount }} 人已报名</span>
            </div>
          </div>

          <!-- Time & Date Info -->
          <div class="flex items-start gap-3 mb-4">
            <div class="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 text-indigo-400 border border-indigo-500/20">
              <Calendar class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-lg text-white/90 tracking-tight font-mono tabular-nums">
                {{ dayjs(activity.startTime).format('YYYY年MM月DD日') }}
                <span class="text-sm font-normal text-white/40 ml-1">{{ dayjs(activity.startTime).format('ddd') }}</span>
              </div>
              <div class="text-white/50 text-sm mt-0.5 font-medium font-mono tabular-nums">
                {{ dayjs(activity.startTime).format('HH:mm') }} - {{ activity.endTime ? dayjs(activity.endTime).format('HH:mm') : '未设置结束时间' }}
              </div>
            </div>
          </div>

          <!-- Participants Progress -->
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0 text-orange-400 border border-orange-500/20">
              <User class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center mb-2">
                <div class="font-bold text-lg text-white/90 tracking-tight font-mono tabular-nums">
                  {{ seats.filter(s => s.isOccupied).length }} / {{ maxParticipants }}
                  <span class="text-sm font-normal text-white/40 ml-1">人</span>
                </div>
              </div>
              <div class="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="seats.filter(s => s.isOccupied).length >= maxParticipants ? 'bg-red-500' : 'bg-emerald-500'"
                  :style="{ width: `${Math.min((seats.filter(s => s.isOccupied).length / maxParticipants) * 100, 100)}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Countdown Timer Card -->
      <PhaseIndicator
        v-if="phase === 'registration' && activity.registrationDeadline"
        :phase="phase"
        :registration-deadline="activity.registrationDeadline"
        :registration-count="registrationCount"
      />

      <!-- Description Card -->
      <div v-if="activity.description" class="bg-white rounded-xl border p-4 shadow-xs">
        <p class="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
          {{ activity.description }}
        </p>
      </div>

      <!-- Registration Phase Form -->
      <ActivityRegistrationPhase
        v-if="phase === 'registration'"
        :activity-id="activity.id"
        :registration-form-key="registrationFormKey"
        :my-registration="myRegistration"
        @success="onRegistrationSuccess"
      />

      <!-- Booking Phase Content -->
      <ActivityBookingPhase
        v-else
        :seats="seats"
        :my-seat="mySeat"
        :my-registration="myRegistration"
        :current-user-id="authStore.user?.id"
        @seat-click="openOccupy"
      />
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
          <DialogTitle class="font-mono tabular-nums">
            抢占 {{ selectedSeatNumber }} 号位次
          </DialogTitle>
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

    <!-- Manage Dialog (Update Remark or Release) -->
    <Dialog v-model:open="showManageDialog">
      <DialogContent class="max-w-[90%] rounded-2xl top-[20%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle class="font-mono tabular-nums">
            管理我的位次 ({{ mySeat?.seatNumber }}号)
          </DialogTitle>
          <DialogDescription>
            修改备注信息或释放该位次
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>备注</Label>
            <Input
              v-model="manageRemark"
              placeholder="例如：表演的歌曲名称"
              class="h-12"
            />
          </div>
        </div>

        <DialogFooter class="flex-col sm:flex-row gap-3 sm:justify-between">
          <Button
            size="sm"
            variant="destructive"
            @click="() => { showManageDialog = false; showReleaseDialog = true }"
          >
            释放位次
          </Button>
          <div class="flex gap-3 w-full sm:w-auto">
            <Button class="flex-1 sm:flex-none" size="sm" variant="outline" @click="showManageDialog = false">
              取消
            </Button>
            <Button class="flex-1 sm:flex-none" size="sm" :disabled="isUpdating" @click="handleUpdateRemark">
              {{ isUpdating ? '保存中...' : '保存修改' }}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Release Dialog -->
    <Dialog v-model:open="showReleaseDialog">
      <DialogContent class="max-w-[90%] rounded-2xl top-[20%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>释放位次</DialogTitle>
          <DialogDescription>
            <span class="font-mono tabular-nums">确定要放弃 {{ mySeat?.seatNumber }} 号位次吗？</span>
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
