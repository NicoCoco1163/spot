<script setup lang="ts">
import { ArrowLeft, ArrowLeftRight, ChevronDown, ClipboardList, Loader2, RefreshCcw, Share2 } from '@lucide/vue'
import { useClipboard, useIntervalFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useAuthStore } from '~/stores/auth'
import { isMainlandMobile, normalizeMobile } from '~/utils/mobile'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const dayjs = useDayjs()
const { copy } = useClipboard()

const activityCode = computed(() => String(route.params.code || ''))
const isAdmin = computed(() => !!authStore.user?.isAdmin)
const participantMobile = ref('')
const mobileDraft = ref('')
const isRegistrationEditorOpen = ref(false)
const registrationFormKey = ref(0)
const activityQuery = computed(() => ({
  mobile: isAdmin.value ? undefined : participantMobile.value || undefined,
}))

const { data, refresh, error, pending: isRefreshing } = await useFetch(() => `/api/activities/user/${activityCode.value}`, {
  query: activityQuery,
})

const {
  data: adminRegistrationsData,
  refresh: refreshAdminRegistrations,
  pending: isAdminRegistrationsPending,
} = await useFetch(() => `/api/activities/admin/registrations/${activityCode.value}`, {
  immediate: false,
  server: false,
  watch: false,
})

onMounted(() => {
  if (isAdmin.value) {
    refreshAdminRegistrations()
  }
  else {
    const savedMobile = localStorage.getItem('spot_participant_mobile') || ''
    mobileDraft.value = savedMobile
    if (isMainlandMobile(savedMobile)) {
      participantMobile.value = normalizeMobile(savedMobile)
      mobileDraft.value = participantMobile.value
      refresh()
    }
  }
})

const { pause } = useIntervalFn(() => {
  if (import.meta.client && !document.hidden && !isRegistrationEditorOpen.value) {
    refresh()
    if (isAdmin.value)
      refreshAdminRegistrations()
  }
}, 5000)

onUnmounted(() => {
  pause()
})

const activity = computed(() => data.value?.activity)
const seats = computed(() => data.value?.seats || [])
const phase = computed(() => data.value?.phase || 'registration')
const registrationCount = computed(() => data.value?.registrationCount || 0)
const adminRegistrations = computed(() => adminRegistrationsData.value?.registrations || [])
const shouldShowAdminRegistrationSkeleton = computed(() => isAdminRegistrationsPending.value && !adminRegistrationsData.value)
const myRegistration = computed(() => data.value?.myRegistration)
const mobileDraftNormalized = computed(() => normalizeMobile(mobileDraft.value))
const mobileDraftValid = computed(() => isMainlandMobile(mobileDraft.value))
const savedMobileValid = computed(() => isMainlandMobile(participantMobile.value))
const mobileSaved = computed(() => savedMobileValid.value && mobileDraftNormalized.value === participantMobile.value)
const mobileReady = computed(() => mobileDraftValid.value && mobileSaved.value)
const mobileDirty = computed(() => mobileDraftNormalized.value !== participantMobile.value)
const maskedMobile = computed(() => participantMobile.value.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'))
const mobileLocked = computed(() => phase.value === 'booking' && !!myRegistration.value && mobileSaved.value)
const occupiedCount = computed(() => seats.value.filter(s => s.isOccupied).length)
const mySeat = computed(() => seats.value.find(s => s.mobile === participantMobile.value))
const seatCapacity = computed(() => phase.value === 'booking' ? seats.value.length || registrationCount.value : registrationCount.value)
const seatByMobile = computed(() => {
  return new Map(seats.value.filter(s => s.mobile).map(s => [s.mobile, s]))
})
const adminRegistrationRows = computed(() => {
  return [...adminRegistrations.value]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((registration, index) => ({
      ...registration,
      index: index + 1,
      seat: seatByMobile.value.get(registration.mobile),
    }))
})
const needsRequiredDetails = computed(() => {
  return !!myRegistration.value && (!myRegistration.value.teamName?.trim() || !myRegistration.value.songName?.trim())
})

const statusText = computed(() => {
  if (!activity.value)
    return '加载中'
  if (activity.value.status === 'cancelled')
    return '已取消'
  if (activity.value.status === 'completed')
    return '已结束'
  return phase.value === 'registration' ? '报名中' : '抢位中'
})

const statusVariant = computed(() => {
  if (activity.value?.status === 'cancelled' || activity.value?.status === 'completed')
    return 'secondary'
  return phase.value === 'registration' ? 'default' : 'secondary'
})

const showOccupyDialog = ref(false)
const selectedSeatNumber = ref<number | null>(null)
const isOccupying = ref(false)

const showReleaseDialog = ref(false)
const isReleasing = ref(false)

const showManageDialog = ref(false)
const isUpdating = ref(false)
const manageRemark = ref('')

const isSwapMode = ref(false)
const swapFromSeatNumber = ref<number | null>(null)
const isSwapping = ref(false)
const isManualRefreshing = ref(false)
const isRefreshButtonBusy = computed(() => isRefreshing.value || isManualRefreshing.value || (isAdmin.value && isAdminRegistrationsPending.value))

function rememberMobile(mobile: string) {
  const normalized = normalizeMobile(mobile)
  participantMobile.value = normalized
  mobileDraft.value = normalized
  if (import.meta.client) {
    localStorage.setItem('spot_participant_mobile', normalized)
  }
}

function onRegistrationSuccess(mobile: string) {
  rememberMobile(mobile)
  refresh()
  registrationFormKey.value++
}

function handleShare() {
  copy(window.location.href)
  toast.success('链接已复制')
}

function handleSaveMobile() {
  if (!mobileDraftValid.value) {
    toast.error('请输入有效的中国大陆手机号')
    return
  }
  const normalized = mobileDraftNormalized.value
  participantMobile.value = normalized
  mobileDraft.value = normalized
  if (import.meta.client) {
    localStorage.setItem('spot_participant_mobile', normalized)
  }
  toast.success('手机号已保存')
  refresh()
}

async function handleManualRefresh() {
  if (isRefreshButtonBusy.value)
    return

  isManualRefreshing.value = true
  try {
    await Promise.all([
      refresh(),
      isAdmin.value ? refreshAdminRegistrations() : Promise.resolve(),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ])
  }
  finally {
    isManualRefreshing.value = false
  }
}

function handleChangeMobile() {
  if (mobileLocked.value)
    return
  participantMobile.value = ''
}

function resetSwapState() {
  swapFromSeatNumber.value = null
}

function toggleSwapMode() {
  if (phase.value !== 'booking') {
    toast.warning('仅抢位阶段支持换位')
    return
  }
  if (!authStore.user?.isAdmin)
    return
  isSwapMode.value = !isSwapMode.value
  resetSwapState()
  toast.info(isSwapMode.value ? '换位模式已开启' : '已退出换位模式')
}

async function handleSwapSeatClick(seat: any) {
  if (!isSwapMode.value || !authStore.user?.isAdmin)
    return false
  if (!seat.isOccupied) {
    toast.warning('只能选择已占用的位次')
    return true
  }
  if (!swapFromSeatNumber.value) {
    swapFromSeatNumber.value = seat.seatNumber
    toast.info(`已选择 ${seat.seatNumber} 号位次`)
    return true
  }
  if (swapFromSeatNumber.value === seat.seatNumber) {
    resetSwapState()
    return true
  }
  if (isSwapping.value)
    return true

  isSwapping.value = true
  try {
    await $fetch('/api/activities/seats/swap', {
      method: 'POST',
      body: {
        activityCode: activityCode.value,
        fromSeatNumber: swapFromSeatNumber.value,
        toSeatNumber: seat.seatNumber,
      },
    })
    toast.success('位次已交换')
    resetSwapState()
    refresh()
  }
  catch (err: any) {
    toast.error(err.data?.message || err.statusMessage || err.message || '换位失败')
    refresh()
  }
  finally {
    isSwapping.value = false
  }
  return true
}

function openManage(seat: any) {
  if (!seat.isOccupied || seat.mobile !== participantMobile.value)
    return
  manageRemark.value = seat.remark || ''
  showManageDialog.value = true
}

async function openOccupy(seat: any) {
  if (await handleSwapSeatClick(seat))
    return
  if (activity.value?.status !== 'published') {
    toast.error('活动不可操作')
    return
  }
  if (seat.isOccupied) {
    if (seat.mobile === participantMobile.value) {
      openManage(seat)
    }
    else {
      toast.info(`该位次已被 ${seat.registration?.teamName || `尾号${seat.mobile?.slice(-4)}`} 占用`)
    }
    return
  }
  if (!mobileReady.value) {
    toast.warning('请先输入并保存有效手机号')
    return
  }
  if (!myRegistration.value) {
    toast.warning('该手机号未在截止前报名')
    return
  }
  if (needsRequiredDetails.value) {
    toast.warning('请先补齐队伍名称和歌曲名称')
    return
  }
  if (mySeat.value) {
    toast.warning(`您已占用了 ${mySeat.value.seatNumber} 号位次`)
    return
  }
  selectedSeatNumber.value = seat.seatNumber
  showOccupyDialog.value = true
}

async function openAdminSeat(seat: any) {
  if (await handleSwapSeatClick(seat))
    return
  if (seat.isOccupied) {
    toast.info(`${seat.seatNumber} 号位次：${seat.registration?.teamName || `尾号${seat.mobile?.slice(-4)}`}`)
  }
}

async function handleOccupy() {
  if (!selectedSeatNumber.value)
    return
  if (!mobileReady.value) {
    toast.error('请先输入并保存有效手机号')
    return
  }
  isOccupying.value = true
  try {
    await $fetch('/api/activities/seats/occupy', {
      method: 'POST',
      body: {
        activityCode: activityCode.value,
        seatNumber: selectedSeatNumber.value,
        mobile: participantMobile.value,
      },
    })
    toast.success('抢位成功')
    showOccupyDialog.value = false
    refresh()
  }
  catch (err: any) {
    toast.error(err.data?.message || err.statusMessage || err.message || '抢位失败')
    refresh()
  }
  finally {
    isOccupying.value = false
  }
}

async function handleUpdateRemark() {
  if (!mySeat.value)
    return
  isUpdating.value = true
  try {
    await $fetch('/api/activities/seats/update-remark', {
      method: 'POST',
      body: {
        activityCode: activityCode.value,
        seatNumber: mySeat.value.seatNumber,
        mobile: participantMobile.value,
        remark: manageRemark.value,
      },
    })
    toast.success('备注已更新')
    showManageDialog.value = false
    refresh()
  }
  catch (err: any) {
    toast.error(err.data?.message || err.statusMessage || err.message || '更新失败')
  }
  finally {
    isUpdating.value = false
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
        activityCode: activityCode.value,
        seatNumber: mySeat.value.seatNumber,
        mobile: participantMobile.value,
      },
    })
    toast.success('已释放位次')
    showReleaseDialog.value = false
    refresh()
  }
  catch (err: any) {
    toast.error(err.data?.message || err.statusMessage || err.message || '释放失败')
  }
  finally {
    isReleasing.value = false
  }
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ')}"`
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function handleExportRegistrationCSV() {
  try {
    const result = await $fetch<{ registrations: any[] }>(`/api/activities/admin/registrations/${activityCode.value}`)
    const registrationList = result.registrations || []
    if (registrationList.length === 0) {
      toast.warning('暂无报名数据')
      return
    }
    const header = ['手机号', '队伍名称', '歌曲名称', '歌曲时长', '队员名称', '报名时间', '更新时间'].join(',')
    const rows = [...registrationList]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(r => [
        escapeCsv(r.mobile),
        escapeCsv(r.teamName),
        escapeCsv(r.songName),
        escapeCsv(r.songDuration),
        escapeCsv(r.members),
        escapeCsv(r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''),
        escapeCsv(r.updatedAt ? dayjs(r.updatedAt).format('YYYY-MM-DD HH:mm:ss') : ''),
      ].join(','))
      .join('\n')
    downloadCsv(`${activity.value?.title || `activity-${activityCode.value}`}-registrations.csv`, `${header}\n${rows}`)
    toast.success('报名 CSV 已导出')
  }
  catch (err: any) {
    toast.error(err.data?.message || err.statusMessage || err.message || '导出报名失败')
  }
}

function handleExportSeatCSV() {
  const occupiedSeats = seats.value.filter(s => s.isOccupied && s.mobile)
  if (occupiedSeats.length === 0) {
    toast.warning('暂无占位数据')
    return
  }
  const header = ['位次', '手机号', '队伍名称', '歌曲名称', '歌曲时长', '队员名称', '报名时间', '占位时间'].join(',')
  const rows = [...occupiedSeats]
    .sort((a, b) => a.seatNumber - b.seatNumber)
    .map(s => [
      escapeCsv(s.seatNumber),
      escapeCsv(s.mobile),
      escapeCsv(s.registration?.teamName),
      escapeCsv(s.registration?.songName),
      escapeCsv(s.registration?.songDuration),
      escapeCsv(s.registration?.members),
      escapeCsv(s.registration?.createdAt ? dayjs(s.registration.createdAt).format('YYYY-MM-DD HH:mm:ss') : ''),
      escapeCsv(s.occupiedAt ? dayjs(s.occupiedAt).format('YYYY-MM-DD HH:mm:ss') : ''),
    ].join(','))
    .join('\n')
  downloadCsv(`${activity.value?.title || `activity-${activityCode.value}`}-seats.csv`, `${header}\n${rows}`)
  toast.success('占位 CSV 已导出')
}

function formatDuration(seconds: unknown) {
  if (seconds === null || seconds === undefined || seconds === '')
    return '未填写'
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0)
    return '未填写'
  const minutes = Math.floor(value / 60)
  const rest = value % 60
  if (minutes <= 0)
    return `${rest} 秒`
  if (rest === 0)
    return `${minutes} 分钟`
  return `${minutes} 分 ${rest} 秒`
}

function goBack() {
  if (isAdmin.value)
    router.push('/')
  else
    router.push('/login')
}

function goEdit() {
  router.push(`/a/edit/${activityCode.value}`)
}

watch([phase, () => activity.value?.status], () => {
  if (phase.value !== 'booking' || activity.value?.status !== 'published') {
    isSwapMode.value = false
    resetSwapState()
  }
})

watch(isAdmin, (value) => {
  if (import.meta.client && value) {
    participantMobile.value = ''
    mobileDraft.value = ''
    refresh()
    refreshAdminRegistrations()
  }
})
</script>

<template>
  <div class="min-h-screen bg-muted/30 pb-8">
    <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div class="mx-auto flex w-full max-w-full items-center gap-2 px-3 py-2">
        <Button v-if="isAdmin" variant="ghost" size="icon" class="h-9 w-9 shrink-0" @click="goBack">
          <ArrowLeft class="h-4 w-4" />
          <span class="sr-only">返回</span>
        </Button>
        <div class="min-w-0 flex-1">
          <div class="truncate text-base font-semibold leading-6">
            {{ activity?.title || '活动详情' }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{ activity ? dayjs(activity.deadline).format('MM月DD日 HH:mm 报名截止') : '加载中' }}
          </div>
        </div>
        <Badge :variant="statusVariant">
          {{ statusText }}
        </Badge>
        <Button variant="outline" size="icon" class="h-9 w-9 shrink-0" :disabled="isRefreshButtonBusy" @click="handleManualRefresh">
          <RefreshCcw class="h-4 w-4" :class="{ 'animate-spin': isRefreshButtonBusy }" />
          <span class="sr-only">刷新</span>
        </Button>
      </div>
    </header>

    <main v-if="activity" class="mx-auto w-full max-w-full space-y-3 p-3">
      <div v-if="!isAdmin" class="rounded-lg border bg-background">
        <div class="space-y-2 p-3">
          <p v-if="activity.description" class="whitespace-pre-wrap text-sm text-muted-foreground">
            {{ activity.description }}
          </p>

          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-md bg-muted/50 px-2.5 py-2">
              <div class="text-xs text-muted-foreground">报名</div>
              <div class="text-base font-semibold">{{ registrationCount }}</div>
            </div>
            <div class="rounded-md bg-muted/50 px-2.5 py-2">
              <div class="text-xs text-muted-foreground">占位</div>
              <div class="text-base font-semibold">{{ occupiedCount }} / {{ seatCapacity }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isAdmin" class="rounded-lg border bg-background">
        <div v-if="mobileReady" class="flex items-center justify-between gap-3 px-3 py-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">手机号</span>
              <Badge variant="secondary" class="shrink-0">已保存</Badge>
            </div>
            <div class="mt-0.5 truncate font-mono text-sm text-muted-foreground">
              {{ maskedMobile }}
            </div>
          </div>
          <Button v-if="!mobileLocked" variant="ghost" size="sm" class="h-8 shrink-0 px-2" @click="handleChangeMobile">
            更换
          </Button>
        </div>

        <div v-else class="space-y-2 p-3">
          <div>
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-base font-semibold leading-6">手机号</h2>
              <Badge :variant="mobileReady ? 'default' : 'secondary'">
                {{ mobileReady ? '已保存' : (mobileDirty ? '未保存' : '待保存') }}
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground">
              保存后才加载报名状态和操作入口
            </p>
          </div>
          <Input
            v-model="mobileDraft"
            type="tel"
            inputmode="tel"
            placeholder="请输入国内手机号"
            class="h-11"
            maxlength="11"
            :disabled="phase === 'booking' && !!myRegistration && mobileSaved"
          />
          <Button class="h-10 w-full" :disabled="!mobileDraftValid || mobileSaved" @click="handleSaveMobile">
            {{ mobileSaved ? '手机号已保存' : '保存手机号' }}
          </Button>
          <div class="text-xs">
            <span
              class="truncate"
              :class="mobileReady ? 'text-emerald-600' : (mobileDraftValid ? 'text-amber-600' : 'text-muted-foreground')"
            >
              <template v-if="mobileReady">
                {{ myRegistration ? '已保存，并匹配到报名记录' : '手机号已保存' }}
              </template>
              <template v-else-if="mobileDraftValid">
                手机号格式有效，但尚未保存；保存后才会写入浏览器并用于报名
              </template>
              <template v-else>
                请输入 11 位中国大陆手机号，不支持座机、港澳台或国际号码
              </template>
            </span>
            <span v-if="mobileReady && phase === 'registration'" class="text-muted-foreground">
              当前 {{ registrationCount }} 人已报名
            </span>
          </div>
        </div>
      </div>

      <div v-if="!isAdmin && !mobileReady" class="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        输入有效中国大陆手机号并点击保存后，才会记录到浏览器并加载报名状态；报名截止后仅已报名手机号可抢位。
      </div>

      <ActivityRegistrationPhase
        v-if="!isAdmin && phase === 'registration' && mobileReady"
        :activity-code="activity.code"
        :registration-form-key="registrationFormKey"
        :my-registration="myRegistration"
        :current-mobile="participantMobile"
        @success="onRegistrationSuccess"
      />

      <ActivityBookingPhase
        v-if="!isAdmin && phase === 'booking' && mobileReady"
        :activity-code="activity.code"
        :seats="seats"
        :my-seat="mySeat"
        :my-registration="myRegistration"
        :current-mobile="participantMobile"
        :swap-mode="isSwapMode"
        :swap-from-seat-number="swapFromSeatNumber"
        @seat-click="openOccupy"
        @registration-success="onRegistrationSuccess"
        @registration-editor-open-change="(open) => isRegistrationEditorOpen = open"
      />

      <div v-if="isAdmin" class="rounded-lg border bg-background">
        <div class="space-y-3 p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-base font-semibold leading-6">报名明细</h2>
              <p class="text-sm text-muted-foreground">
                当前活动所有报名信息
              </p>
            </div>
            <Badge variant="secondary" class="shrink-0">
              {{ adminRegistrationRows.length }} 条
            </Badge>
          </div>

          <div v-if="shouldShowAdminRegistrationSkeleton" class="space-y-2">
            <div v-for="i in 3" :key="i" class="h-24 rounded-md bg-muted" />
          </div>

          <div v-else-if="adminRegistrationRows.length === 0" class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            暂无报名记录
          </div>

          <div v-else class="max-h-[min(70vh,48rem)] space-y-1.5 overflow-y-auto pr-1">
            <details
              v-for="registration in adminRegistrationRows"
              :key="registration.id"
              class="group rounded-md border bg-background"
            >
              <summary class="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
                <span class="w-7 shrink-0 font-mono text-xs text-muted-foreground">#{{ registration.index }}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <div class="min-w-0 truncate text-sm font-semibold leading-5">
                      {{ registration.teamName || '未填写队伍' }}
                    </div>
                    <span class="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
                      {{ registration.songName || '未填歌曲' }}
                    </span>
                  </div>
                  <div class="mt-0.5 truncate font-mono text-xs leading-4 text-muted-foreground">
                    {{ registration.mobile }}
                  </div>
                </div>
                <Badge :variant="registration.seat ? 'default' : 'outline'" class="h-6 shrink-0 px-2">
                  {{ registration.seat ? `${registration.seat.seatNumber} 号` : '未占位' }}
                </Badge>
                <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>

              <div class="border-t px-2.5 py-2">
                <div class="grid grid-cols-2 gap-1.5 text-sm">
                  <div class="min-w-0 rounded-md bg-muted/40 px-2 py-1.5">
                    <div class="text-xs leading-4 text-muted-foreground">歌曲</div>
                    <div class="truncate font-medium leading-5">{{ registration.songName || '未填写' }}</div>
                  </div>
                  <div class="min-w-0 rounded-md bg-muted/40 px-2 py-1.5">
                    <div class="text-xs leading-4 text-muted-foreground">时长</div>
                    <div class="truncate font-medium leading-5">{{ formatDuration(registration.songDuration) }}</div>
                  </div>
                </div>

                <div class="mt-1.5 rounded-md bg-muted/40 px-2 py-1.5 text-sm">
                  <div class="text-xs leading-4 text-muted-foreground">队员</div>
                  <div class="whitespace-pre-wrap break-words leading-5">{{ registration.members || '未填写' }}</div>
                </div>

                <div class="mt-1.5 grid grid-cols-2 gap-2 text-xs leading-5 text-muted-foreground">
                  <div class="min-w-0 truncate">
                    报名 {{ registration.createdAt ? dayjs(registration.createdAt).format('MM-DD HH:mm') : '-' }}
                  </div>
                  <div class="min-w-0 truncate text-right">
                    更新 {{ registration.updatedAt ? dayjs(registration.updatedAt).format('MM-DD HH:mm') : '-' }}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      <ActivityBookingPhase
        v-if="isAdmin && phase === 'booking'"
        admin-mode
        :activity-code="activity.code"
        :seats="seats"
        :my-seat="null"
        :my-registration="null"
        :current-mobile="undefined"
        :swap-mode="isSwapMode"
        :swap-from-seat-number="swapFromSeatNumber"
        @seat-click="openAdminSeat"
        @registration-success="() => {}"
        @registration-editor-open-change="() => {}"
      />

      <div v-if="isAdmin" class="rounded-lg border bg-background">
        <div class="space-y-3 p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-base font-semibold leading-6">操作员管理</h2>
              <p class="text-sm text-muted-foreground">
                当前活动的基础操作和现场数据
              </p>
            </div>
            <Badge variant="outline" class="shrink-0">
              管理员
            </Badge>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-md bg-muted/50 px-2 py-2">
              <div class="text-xs text-muted-foreground">阶段</div>
              <div class="truncate text-sm font-medium">{{ phase === 'registration' ? '报名' : '抢位' }}</div>
            </div>
            <div class="rounded-md bg-muted/50 px-2 py-2">
              <div class="text-xs text-muted-foreground">报名</div>
              <div class="text-sm font-medium">{{ registrationCount }}</div>
            </div>
            <div class="rounded-md bg-muted/50 px-2 py-2">
              <div class="text-xs text-muted-foreground">占位</div>
              <div class="text-sm font-medium">{{ occupiedCount }}/{{ seatCapacity }}</div>
            </div>
          </div>

          <div class="rounded-lg border">
            <div class="grid gap-3 p-3">
              <div class="min-w-0">
                <div class="text-sm font-medium">活动链接</div>
                <div class="mt-1 truncate rounded-md bg-muted/50 px-2 py-1.5 font-mono text-xs text-muted-foreground">
                  /a/{{ activity.code }}
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" class="w-full" @click="handleShare">
                  <Share2 class="mr-2 h-4 w-4" />
                  复制链接
                </Button>
                <Button variant="outline" size="sm" class="w-full" @click="goEdit">
                  编辑活动
                </Button>
              </div>
            </div>

            <Separator />

            <div v-if="phase === 'registration'" class="grid gap-3 p-3">
              <div class="grid gap-1">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-sm font-medium">报名数据</div>
                  <Badge variant="secondary" class="shrink-0">
                    CSV
                  </Badge>
                </div>
                <div class="text-xs leading-5 text-muted-foreground">
                  导出当前报名记录，包含手机号、队伍、歌曲和报名时间
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="w-full"
                :disabled="registrationCount === 0"
                @click="handleExportRegistrationCSV"
              >
                <ClipboardList class="mr-2 h-4 w-4" />
                导出报名 CSV
              </Button>
            </div>

            <div v-else class="grid gap-3 p-3">
              <div class="grid gap-1">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-sm font-medium">占位数据</div>
                  <Badge variant="secondary" class="shrink-0">
                    CSV
                  </Badge>
                </div>
                <div class="text-xs leading-5 text-muted-foreground">
                  导出已占位记录，包含位次、手机号、队伍、歌曲和占位时间
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="w-full"
                :disabled="phase !== 'booking' || occupiedCount === 0"
                @click="handleExportSeatCSV"
              >
                <ClipboardList class="mr-2 h-4 w-4" />
                导出占位 CSV
              </Button>
            </div>

            <Separator v-if="phase === 'booking'" />

            <div v-if="phase === 'booking'" class="grid gap-3 p-3">
              <div class="grid gap-1">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-sm font-medium">位次调整</div>
                  <Badge :variant="isSwapMode ? 'default' : 'secondary'" class="shrink-0">
                    {{ isSwapMode ? '进行中' : '未开启' }}
                  </Badge>
                </div>
                <div class="text-xs leading-5 text-muted-foreground">
                  抢位阶段可选择两个已占用位次并交换报名信息
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="w-full"
                :disabled="phase !== 'booking' || isSwapping || occupiedCount < 2"
                @click="toggleSwapMode"
              >
                <ArrowLeftRight class="mr-2 h-4 w-4" />
                {{ isSwapMode ? '退出换位模式' : '进入换位模式' }}
              </Button>
              <div v-if="phase !== 'booking'" class="text-xs text-muted-foreground">
                报名截止后才进入抢位阶段，届时可调整已占用位次。
              </div>
              <div v-else-if="occupiedCount < 2" class="text-xs text-muted-foreground">
                至少需要 2 个已占用位次才可以交换。
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isSwapMode" class="rounded-lg border bg-background px-3 py-2 text-sm">
        {{ swapFromSeatNumber ? `已选择 ${swapFromSeatNumber} 号位次，请点击另一个已占用位次` : '换位模式：请选择第一个已占用位次' }}
      </div>
    </main>

    <div v-else-if="error" class="p-8 text-center text-destructive">
      活动加载失败
    </div>
    <div v-else class="p-8 text-center text-muted-foreground">
      <Loader2 class="mx-auto mb-2 h-8 w-8 animate-spin" />
      加载中...
    </div>

    <Dialog v-model:open="showOccupyDialog">
      <DialogContent class="max-w-[calc(100%-1.5rem)]" @open-auto-focus.prevent>
        <DialogHeader>
          <DialogTitle>抢占 {{ selectedSeatNumber }} 号位次</DialogTitle>
          <DialogDescription>
            将使用当前手机号锁定该位次
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="grid grid-cols-2 gap-2">
          <Button variant="outline" @click="showOccupyDialog = false">
            取消
          </Button>
          <Button :disabled="isOccupying" @click="handleOccupy">
            {{ isOccupying ? '处理中...' : '确认抢位' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showManageDialog">
      <DialogContent class="max-w-[calc(100%-1.5rem)]">
        <DialogHeader>
          <DialogTitle>管理 {{ mySeat?.seatNumber }} 号位次</DialogTitle>
          <DialogDescription>
            可修改备注，报名资料请在抢位资格区域修改
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <Label>备注</Label>
          <Input v-model="manageRemark" placeholder="可选备注" />
        </div>
        <DialogFooter class="grid gap-2">
          <Button variant="destructive" class="w-full" @click="() => { showManageDialog = false; showReleaseDialog = true }">
            释放位次
          </Button>
          <div class="grid grid-cols-2 gap-2">
            <Button variant="outline" class="w-full" @click="showManageDialog = false">
              取消
            </Button>
            <Button class="w-full" :disabled="isUpdating" @click="handleUpdateRemark">
              {{ isUpdating ? '保存中...' : '保存' }}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showReleaseDialog">
      <DialogContent class="max-w-[calc(100%-1.5rem)]">
        <DialogHeader>
          <DialogTitle>释放位次</DialogTitle>
          <DialogDescription>
            确定释放 {{ mySeat?.seatNumber }} 号位次吗？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="grid grid-cols-2 gap-2">
          <Button variant="outline" @click="showReleaseDialog = false">
            取消
          </Button>
          <Button variant="destructive" :disabled="isReleasing" @click="handleRelease">
            {{ isReleasing ? '处理中...' : '确认释放' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
