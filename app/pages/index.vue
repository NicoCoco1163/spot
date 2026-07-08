<script setup lang="ts">
import { ChevronLeft, ChevronRight, Clock, LogOut, Plus, RefreshCcw, Search, X } from '@lucide/vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const router = useRouter()
const dayjs = useDayjs()

const page = ref(1)
const limit = 10
const status = ref('all')
const phase = ref('all')
const keywordInput = ref('')
const keyword = ref('')

let keywordTimer: ReturnType<typeof setTimeout> | null = null
watch(keywordInput, (value) => {
  if (keywordTimer)
    clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    keyword.value = value.trim()
  }, 250)
})

onUnmounted(() => {
  if (keywordTimer)
    clearTimeout(keywordTimer)
})

const query = computed(() => ({
  page: page.value,
  limit,
  status: status.value,
  phase: phase.value,
  keyword: keyword.value,
}))

const { data, pending, refresh } = await useFetch('/api/activities/admin', {
  query,
})

const isManualRefreshing = ref(false)
const isRefreshButtonBusy = computed(() => pending.value || isManualRefreshing.value)
const activities = computed(() => authStore.user?.isAdmin ? data.value?.activities || [] : [])
const pagination = computed(() => data.value?.pagination || {
  page: 1,
  limit,
  total: 0,
  totalPages: 1,
  hasMore: false,
})
const visibleFrom = computed(() => pagination.value.total === 0 ? 0 : (pagination.value.page - 1) * pagination.value.limit + 1)
const visibleTo = computed(() => Math.min(pagination.value.page * pagination.value.limit, pagination.value.total))
const hasActiveFilters = computed(() => status.value !== 'all' || phase.value !== 'all' || keyword.value.length > 0 || keywordInput.value.trim().length > 0)

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'cancelled', label: '已取消' },
  { value: 'completed', label: '已结束' },
]

const phaseOptions = [
  { value: 'all', label: '全部阶段' },
  { value: 'registration', label: '报名中' },
  { value: 'booking', label: '抢位中' },
]

watch([status, phase, keyword], () => {
  page.value = 1
})

function statusLabel(value: string) {
  const map: Record<string, string> = {
    published: '已发布',
    cancelled: '已取消',
    completed: '已结束',
  }
  return map[value] || value
}

function phaseLabel(value: string) {
  return value === 'registration' ? '报名中' : '抢位中'
}

function activityBadgeVariant(item: any) {
  if (item.status !== 'published')
    return 'secondary'
  return item.phase === 'registration' ? 'default' : 'outline'
}

function activityStateText(item: any) {
  return item.status === 'published' ? phaseLabel(item.phase) : statusLabel(item.status)
}

function formatDeadline(item: any) {
  return dayjs(item.deadline).format('MM-DD HH:mm')
}

function goDetail(code: string) {
  router.push(`/a/${code}`)
}

function goEdit(code: string) {
  router.push(`/a/edit/${code}`)
}

function clearFilters() {
  status.value = 'all'
  phase.value = 'all'
  keywordInput.value = ''
  keyword.value = ''
}

async function logout() {
  await authStore.logout()
  router.push('/login')
}

async function handleManualRefresh() {
  if (isRefreshButtonBusy.value)
    return

  isManualRefreshing.value = true
  try {
    await Promise.all([
      refresh(),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ])
  }
  finally {
    isManualRefreshing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted/30 pb-8">
    <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div class="mx-auto flex w-full max-w-full items-center gap-2 px-3 py-2">
        <Button variant="ghost" size="icon" class="h-9 w-9 shrink-0" @click="logout">
          <LogOut class="h-4 w-4" />
          <span class="sr-only">退出</span>
        </Button>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-base font-semibold leading-6">活动管理</h1>
          <p class="truncate text-xs text-muted-foreground">
            {{ authStore.user ? (authStore.user.nickname || authStore.user.mobile || '管理员') : '未登录' }}
          </p>
        </div>
        <Button v-if="authStore.user?.isAdmin" size="sm" class="h-9 shrink-0 px-3" @click="router.push('/a/create')">
          <Plus class="mr-1.5 h-4 w-4" />
          新建
        </Button>
        <Button variant="outline" size="icon" class="h-9 w-9 shrink-0" :disabled="isRefreshButtonBusy" @click="handleManualRefresh">
          <RefreshCcw class="h-4 w-4" :class="{ 'animate-spin': isRefreshButtonBusy }" />
          <span class="sr-only">刷新</span>
        </Button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-full space-y-3 p-3">
      <Card v-if="authStore.user && !authStore.user.isAdmin">
        <CardHeader>
          <CardTitle>无权限</CardTitle>
          <CardDescription>首页仅用于管理员活动管理。游客只能通过活动链接访问详情页。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" @click="logout">返回登录</Button>
        </CardContent>
      </Card>

      <template v-else>
        <div class="rounded-lg border bg-background">
          <div class="grid gap-3 p-3">
            <div class="space-y-3">
              <div class="relative">
                <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  v-model="keywordInput"
                  class="h-10 pl-9 pr-9"
                  placeholder="搜索活动标题或描述"
                />
                <button
                  v-if="keywordInput"
                  type="button"
                  class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  @click="keywordInput = ''; keyword = ''"
                >
                  <X class="h-3.5 w-3.5" />
                  <span class="sr-only">清除搜索</span>
                </button>
              </div>

              <div class="space-y-2">
                <div class="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-2">
                  <span class="pt-1.5 text-xs text-muted-foreground">状态</span>
                  <div class="flex min-w-0 flex-wrap gap-2">
                    <Button
                      v-for="item in statusOptions"
                      :key="item.value"
                      type="button"
                      size="sm"
                      :variant="status === item.value ? 'default' : 'outline'"
                      class="h-8 px-3"
                      @click="status = item.value"
                    >
                      {{ item.label }}
                    </Button>
                  </div>
                </div>
                <div class="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-2">
                  <span class="pt-1.5 text-xs text-muted-foreground">阶段</span>
                  <div class="flex min-w-0 flex-wrap gap-2">
                    <Button
                      v-for="item in phaseOptions"
                      :key="item.value"
                      type="button"
                      size="sm"
                      :variant="phase === item.value ? 'default' : 'outline'"
                      class="h-8 px-3"
                      @click="phase = item.value"
                    >
                      {{ item.label }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="hasActiveFilters" class="flex min-w-0 items-center justify-between gap-3 border-t pt-3">
              <div class="min-w-0 truncate text-sm text-muted-foreground">
                已应用筛选
              </div>
              <Button v-if="hasActiveFilters" variant="ghost" size="sm" class="h-8 shrink-0" @click="clearFilters">
                清空筛选
              </Button>
            </div>
          </div>
        </div>

        <div class="rounded-lg border bg-background">
          <div v-if="pending" class="space-y-3 p-4">
            <div v-for="i in 4" :key="i" class="h-[88px] rounded-md bg-muted" />
          </div>

          <div v-else-if="activities.length === 0" class="p-8 text-center">
            <div class="text-sm font-medium">没有匹配的活动</div>
            <p class="mt-1 text-sm text-muted-foreground">调整搜索词或清空筛选后再看。</p>
            <Button v-if="hasActiveFilters" variant="outline" size="sm" class="mt-4" @click="clearFilters">
              清空筛选
            </Button>
          </div>

          <div v-else class="divide-y">
            <div
              v-for="item in activities"
              :key="item.code"
              class="grid min-w-0 gap-3 p-3"
            >
              <div class="min-w-0">
                <div class="flex min-w-0 items-center gap-2">
                  <button class="min-w-0 truncate text-left font-medium hover:underline" @click="goDetail(item.code)">
                    {{ item.title }}
                  </button>
                  <Badge class="shrink-0" :variant="activityBadgeVariant(item)">
                    {{ activityStateText(item) }}
                  </Badge>
                </div>
                <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {{ item.description || '暂无描述' }}
                </p>
              </div>

              <div class="flex items-center gap-1.5 text-sm">
                <Clock class="h-3.5 w-3.5 text-muted-foreground" />
                <span>{{ formatDeadline(item) }} 报名截止</span>
              </div>

              <div class="grid min-w-0 grid-cols-2 gap-2 text-sm">
                <div class="rounded-md bg-muted/50 px-2 py-1">
                  <span class="text-xs text-muted-foreground">报名 </span>
                  <span class="font-medium">{{ item.registrationCount || 0 }}</span>
                </div>
                <div class="rounded-md bg-muted/50 px-2 py-1">
                  <span class="text-xs text-muted-foreground">占位 </span>
                  <span class="font-medium">{{ item.occupiedCount || 0 }}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" @click="goDetail(item.code)">
                  详情
                </Button>
                <Button variant="outline" size="sm" @click="goEdit(item.code)">
                  编辑
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-lg border bg-background p-3">
          <div class="flex min-w-0 items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-sm font-medium">
                共 {{ pagination.total }} 个活动
              </div>
              <div class="truncate text-xs text-muted-foreground">
                第 {{ pagination.page }} / {{ pagination.totalPages }} 页
                <span v-if="pagination.total > 0">
                  · 当前 {{ visibleFrom }}-{{ visibleTo }}
                </span>
              </div>
            </div>
            <div class="grid shrink-0 grid-cols-2 gap-2">
              <Button variant="outline" size="sm" class="h-9 min-w-0 px-2.5" :disabled="page <= 1" @click="page--">
                <ChevronLeft class="mr-1 h-4 w-4" />
                上一页
              </Button>
              <Button variant="outline" size="sm" class="h-9 min-w-0 px-2.5" :disabled="!pagination.hasMore" @click="page++">
                下一页
                <ChevronRight class="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
