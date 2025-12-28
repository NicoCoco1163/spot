<script setup lang="ts">
import { useInfiniteScroll } from '@vueuse/core'
import { ArrowDown, Loader2, Plus, User } from 'lucide-vue-next'
import { Motion } from 'motion-v'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const router = useRouter()
const dayjs = useDayjs()

// State
const page = ref(1)
const limit = 10
const activities = ref<any[]>([])
const hasMore = ref(true)
const isLoadingMore = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const touchStartY = ref(0)
const isPulling = ref(false)

// Initial Data
const { data } = await useFetch('/api/activities/user', {
  query: { page: 1, limit },
})

// Hydrate state
watch(data, (newVal) => {
  if (newVal) {
    activities.value = newVal.activities
    hasMore.value = newVal.pagination.hasMore
    page.value = newVal.pagination.page
  }
}, { immediate: true })

function getActivityStatus(item: any) {
  if (item.status === 'cancelled') {
    return {
      class: 'bg-zinc-800 text-zinc-500',
      text: '已取消',
    }
  }
  if (item.status === 'completed') {
    return {
      class: 'bg-zinc-800 text-zinc-500',
      text: '已结束',
    }
  }
  if (item.occupiedCount >= item.maxParticipants) {
    return {
      class: 'bg-red-500/10 text-red-400 border-red-500/20',
      text: '已满',
    }
  }
  return {
    class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    text: '报名中',
    canOperate: true,
  }
}

function goProfile() {
  router.push('/profile')
}

function goDetail(id: number) {
  router.push(`/activities/${id}`)
}

// Load More
async function loadMore() {
  if (isLoadingMore.value || !hasMore.value || isRefreshing.value)
    return
  isLoadingMore.value = true

  try {
    const nextPage = page.value + 1
    const res = await $fetch('/api/activities/user', {
      query: { page: nextPage, limit },
    })

    if (res.activities.length > 0) {
      activities.value.push(...res.activities)
      page.value = nextPage
    }
    hasMore.value = res.pagination.hasMore
  }
  catch (e) {
    console.error('Load more failed', e)
  }
  finally {
    isLoadingMore.value = false
  }
}

// Infinite Scroll
useInfiniteScroll(
  typeof window !== 'undefined' ? window : null,
  loadMore,
  { distance: 100 },
)

// Pull to Refresh Logic
function onTouchStart(e: TouchEvent) {
  if (window.scrollY === 0 && e.touches.length > 0 && e.touches[0]) {
    touchStartY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

function onTouchMove(e: TouchEvent) {
  if (!isPulling.value || e.touches.length === 0 || !e.touches[0])
    return

  const currentY = e.touches[0].clientY
  const dy = currentY - touchStartY.value

  if (dy > 0 && window.scrollY === 0) {
    // Resistance effect
    pullDistance.value = Math.min(dy * 0.5, 120) // Cap at 120px
    if (e.cancelable)
      e.preventDefault() // Prevent native scroll if possible
  }
  else {
    pullDistance.value = 0
  }
}

async function onTouchEnd() {
  if (!isPulling.value)
    return
  isPulling.value = false

  if (pullDistance.value > 60) {
    // Trigger refresh
    isRefreshing.value = true
    pullDistance.value = 60 // Snap to loading position

    try {
      const res = await $fetch('/api/activities/user', {
        query: { page: 1, limit },
      })
      activities.value = res.activities
      page.value = 1
      hasMore.value = res.pagination.hasMore
    }
    catch (e) {
      console.error('Refresh failed', e)
    }
    finally {
      setTimeout(() => {
        isRefreshing.value = false
        pullDistance.value = 0
      }, 500)
    }
  }
  else {
    // Snap back
    pullDistance.value = 0
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 pb-20"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Pull Refresh Indicator -->
    <div
      class="fixed top-0 left-0 w-full flex justify-center items-center h-16 pointer-events-none z-40"
      :class="{ 'transition-transform duration-300 ease-out': !isPulling }"
      :style="{ transform: `translateY(${pullDistance > 0 ? pullDistance + 40 : 0}px)`, opacity: pullDistance > 0 || isRefreshing ? 1 : 0 }"
    >
      <div class="bg-white/80 backdrop-blur-md rounded-full p-2 shadow-md">
        <Loader2 v-if="isRefreshing" class="w-5 h-5 animate-spin text-primary" />
        <ArrowDown v-else class="w-5 h-5 text-gray-500 transition-transform duration-200" :style="{ transform: `rotate(${pullDistance > 60 ? 180 : 0}deg)` }" />
      </div>
    </div>

    <!-- Header -->
    <div
      class="sticky top-0 z-50 bg-[#1c1c1e] backdrop-blur-xl text-white px-5 py-4 flex items-center justify-between shadow-2xl rounded-b-4xl border-b border-white/5 overflow-hidden mb-4"
    >
      <!-- Header Background Decoration -->
      <div class="absolute -right-4 -top-10 h-24 w-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div class="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      <div class="font-bold text-xl tracking-wide relative z-10 flex items-center gap-2">
        <span class="bg-clip-text text-transparent bg-linear-to-r from-white to-white/60">随机舞蹈</span>
      </div>
      <div class="flex items-center gap-3 relative z-10">
        <div class="text-sm text-right h-[32px] flex flex-col justify-center">
          <div class="font-bold leading-none text-white/90">
            {{ getUserNickname(authStore.user) }}
          </div>
          <div class="text-[10px] text-white/40 font-medium">
            {{ getUserRole(authStore.user) }}
          </div>
        </div>
        <Button variant="ghost" size="icon" class="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 transition-all duration-300" @click="goProfile">
          <span class="sr-only">个人中心</span>
          <User class="w-5 h-5" />
        </Button>
      </div>
    </div>

    <!-- Activity List -->
    <div
      class="p-4"
      :class="{ 'transition-transform duration-300 ease-out': !isPulling }"
      :style="{ transform: `translateY(${pullDistance}px)` }"
    >
      <div v-if="activities.length === 0 && !isLoadingMore && !isRefreshing" class="text-center py-10 text-muted-foreground">
        暂无活动
      </div>

      <div v-else class="space-y-4">
        <Motion
          v-for="(item, index) in activities"
          :key="item.id"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ delay: index * 0.1, duration: 0.4 }"
        >
          <!-- Time Label -->
          <div class="mb-1.5 flex items-baseline gap-2 px-1">
            <span class="text-xl font-bold text-gray-900 tracking-tight font-mono">
              {{ dayjs(item.startTime).format('HH:mm') }}
            </span>
            <span class="text-sm font-medium text-gray-500">
              {{ dayjs(item.startTime).format('MM月DD日') }}
            </span>
          </div>

          <!-- Card -->
          <Motion
            class="relative overflow-hidden rounded-2xl bg-[#1c1c1e] text-white shadow-lg cursor-pointer group touch-manipulation select-none"
            :while-hover="{ scale: 1.02 }"
            :while-tap="{ scale: 0.96 }"
            :transition="{ type: 'spring', stiffness: 400, damping: 17 }"
            @click="goDetail(item.id)"
          >
            <!-- Background Decoration -->
            <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl transition-all duration-700 group-hover:bg-white/10 group-active:bg-white/10" />
            <div class="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-all duration-700 group-hover:bg-primary/20 group-active:bg-primary/20" />

            <div class="p-4 relative z-10">
              <!-- Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1 min-w-0 mr-3">
                  <h3 class="text-lg font-bold leading-tight mb-1 truncate text-white/90">
                    {{ item.title }}
                  </h3>
                  <p class="text-xs text-white/50 line-clamp-1 leading-relaxed font-light">
                    {{ item.description || '暂无描述' }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span v-if="dayjs(item.startTime).isAfter(dayjs())" class="text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 backdrop-blur-md shadow-sm">
                    即将开始
                  </span>
                  <Badge
                    class="border px-2 py-0.5 backdrop-blur-md text-[10px] shadow-sm"
                    :class="getActivityStatus(item).class"
                  >
                    {{ getActivityStatus(item).text }}
                  </Badge>
                </div>
              </div>

              <!-- Footer: Seats -->
              <div class="flex items-center justify-between pt-3 border-t border-white/5">
                <div class="flex flex-col gap-1.5 w-full mr-4 flex-1 min-w-0">
                  <div class="flex justify-between text-[10px] font-medium text-white/40">
                    <span>剩余位次</span>
                    <span class="font-mono tracking-tight" :class="item.maxParticipants - item.occupiedCount > 0 ? 'text-emerald-400' : 'text-red-400'">
                      {{ item.maxParticipants - item.occupiedCount }} / {{ item.maxParticipants }}
                    </span>
                  </div>
                  <div class="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <Motion
                      class="h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"
                      :class="item.occupiedCount >= item.maxParticipants ? 'bg-red-500' : 'bg-emerald-500'"
                      :initial="{ width: 0 }"
                      :animate="{ width: `${Math.min((item.occupiedCount / item.maxParticipants) * 100, 100)}%` }"
                      :transition="{ duration: 1, ease: 'easeOut' }"
                    />
                  </div>
                </div>

                <div class="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white group-active:bg-white group-hover:text-black group-active:text-black transition-colors duration-300 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </div>
              </div>
            </div>
          </Motion>
        </Motion>

        <!-- Loading More Indicator -->
        <div v-if="isLoadingMore" class="py-4 flex justify-center">
          <Loader2 class="w-6 h-6 animate-spin text-gray-400" />
        </div>
        <div v-else-if="!hasMore && activities.length > 0" class="py-4 text-center text-xs text-gray-400">
          没有更多活动了
        </div>
      </div>
    </div>

    <!-- Admin Create Button -->
    <div v-if="authStore.user?.isAdmin" class="fixed bottom-8 right-6 z-40">
      <Motion
        :initial="{ scale: 0, rotate: -90 }"
        :animate="{ scale: 1, rotate: 0 }"
        :while-hover="{ scale: 1.1 }"
        :while-tap="{ scale: 0.9 }"
      >
        <Button class="rounded-full h-14 w-14 shadow-xl p-0 bg-[#1c1c1e] text-white hover:bg-zinc-800 border border-white/10" @click.stop="router.push('/activities/create')">
          <Plus class="h-7 w-7" />
        </Button>
      </Motion>
    </div>
  </div>
</template>
