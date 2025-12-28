<script setup lang="ts">
import { ChevronLeft, Loader2, Save } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

const router = useRouter()
const authStore = useAuthStore()

const nickname = ref(authStore.user?.nickname || '')
const isLoading = ref(false)

// Sync with store if user data updates (e.g. initial load)
watch(() => authStore.user, (newUser) => {
  if (newUser && !nickname.value) {
    nickname.value = newUser.nickname || ''
  }
}, { immediate: true })

const nicknameInitial = computed(() => {
  return authStore.user?.nickname?.charAt(0) || authStore.user?.mobile?.charAt(0) || 'U'
})

const roleName = computed(() => {
  return authStore.user?.isAdmin ? '管理员' : '普通用户'
})

async function handleUpdateProfile() {
  if (!nickname.value.trim()) {
    toast.error('昵称不能为空')
    return
  }

  if (nickname.value === authStore.user?.nickname) {
    return // No change
  }

  isLoading.value = true
  try {
    await authStore.updateProfile({ nickname: nickname.value })
    toast.success('昵称修改成功')
  }
  catch (error: any) {
    toast.error(error.message || '修改失败')
  }
  finally {
    isLoading.value = false
  }
}

async function handleUnbindWechat() {
  // eslint-disable-next-line no-alert
  if (!confirm('确定要解除微信绑定吗？解除后将无法使用微信一键登录。')) {
    return
  }

  try {
    await authStore.unbindWechat()
    toast.success('已解除微信绑定')
  }
  catch (error: any) {
    toast.error(error.message || '解绑失败')
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 pb-20">
    <!-- Header -->
    <div class="sticky top-0 z-50 bg-[#1c1c1e] backdrop-blur-xl text-white px-5 py-4 flex items-center justify-between shadow-2xl rounded-b-4xl border-b border-white/5 overflow-hidden mb-4">
      <!-- Header Background Decoration -->
      <div class="absolute -right-4 -top-10 h-24 w-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div class="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      <Button
        variant="ghost"
        size="icon"
        class="-ml-2 h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-full relative z-10 transition-all duration-300"
        @click="router.back()"
      >
        <ChevronLeft class="w-6 h-6" />
      </Button>
      <span class="font-bold text-xl tracking-wide relative z-10">个人中心</span>
      <div class="w-8" />
    </div>

    <div class="px-4 pb-4 max-w-md mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <!-- Profile Header -->
      <div class="flex items-center gap-4 pt-2 pb-2">
        <div class="relative group cursor-default shrink-0">
          <div class="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-medium text-gray-500 border border-gray-200">
            {{ nicknameInitial }}
          </div>
          <div class="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-[3px] border-gray-50" title="在线" />
        </div>

        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-bold text-gray-900 tracking-tight truncate">
            {{ authStore.user?.nickname || '未设置昵称' }}
          </h2>
          <div class="flex items-center gap-2 mt-0.5">
            <p class="text-xs text-gray-400 font-mono">
              {{ authStore.user?.mobile }}
            </p>
            <Badge variant="secondary" class="bg-gray-100 text-gray-500 hover:bg-gray-200 border-transparent font-normal px-2 py-0 text-[10px] h-5">
              {{ roleName }}
            </Badge>
          </div>
        </div>
      </div>

      <!-- Settings Group -->
      <Card class="shadow-xs py-0 bg-white overflow-hidden rounded-xl">
        <CardContent class="p-4">
          <div class="space-y-4">
            <div class="space-y-3">
              <label class="text-xs font-medium text-gray-500 ml-1">昵称</label>
              <div class="flex gap-2">
                <Input
                  v-model="nickname"
                  class="h-9 bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all text-sm"
                  placeholder="请输入昵称"
                />
                <Button
                  :disabled="isLoading || nickname === authStore.user?.nickname"
                  class="h-9 px-4 font-medium shadow-none text-xs"
                  :class="nickname === authStore.user?.nickname ? 'bg-gray-100 text-gray-400 hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'"
                  @click="handleUpdateProfile"
                >
                  <Loader2 v-if="isLoading" class="w-3 h-3 mr-1.5 animate-spin" />
                  <Save v-else class="w-3 h-3 mr-1.5" />
                  保存
                </Button>
              </div>
              <p class="text-[10px] text-gray-400 ml-1">
                昵称将用于活动报名和展示
              </p>
            </div>

            <div class="pt-4 border-t border-gray-50">
              <label class="text-xs font-medium text-gray-500 ml-1 mb-2 block">账号绑定</label>
              <div class="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300"
                    :class="authStore.user?.openid ? 'bg-[#07C160]/10 text-[#07C160]' : 'bg-gray-100 text-gray-400'"
                  >
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8.69 15.658c-4.223 0-7.653-3.054-7.653-6.816 0-3.765 3.43-6.817 7.653-6.817 4.224 0 7.65 3.052 7.65 6.817 0 .848-.168 1.66-.475 2.417.848.435 2.158 1.48 2.158 1.48s-1.372-.11-2.434-.502c-1.636 2.05-4.183 3.42-7.006 3.42h.107zm11.75 3.84s1.173.093 1.847-.352c0 0-1.12-.892-1.846-1.264.262-.647.406-1.34.406-2.065 0-3.212-2.928-5.816-6.533-5.816-3.606 0-6.533 2.604-6.533 5.816 0 3.214 2.927 5.818 6.533 5.818 2.41 0 4.544-1.17 5.666-2.92l.46.783z" /></svg>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      微信
                    </div>
                    <div class="text-[10px] text-gray-400">
                      {{ authStore.user?.openid ? '已绑定微信账号' : '未绑定微信账号' }}
                    </div>
                  </div>
                </div>
                <Button
                  v-if="authStore.user?.openid"
                  variant="outline"
                  size="sm"
                  class="h-7 text-xs border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-100"
                  @click="handleUnbindWechat"
                >
                  解除绑定
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Logout Button -->
      <Button
        variant="outline"
        class="w-full h-11 rounded-xl text-red-500 bg-white hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-all active:scale-[0.99]"
        @click="handleLogout"
      >
        退出登录
      </Button>

      <div class="text-center py-2">
        <span class="text-[10px] text-gray-300 font-mono">Spot v1.0.0</span>
      </div>
    </div>
  </div>
</template>
