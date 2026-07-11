<script setup lang="ts">
import { Pencil } from '@lucide/vue'

const props = defineProps<{
  activityCode: string
  registrationFormKey: number
  myRegistration: any
  currentMobile?: string
}>()

const emit = defineEmits<{
  success: [mobile: string]
  delete: []
  editingChange: [open: boolean]
}>()

const isEditing = ref(false)
watch(isEditing, open => emit('editingChange', open), { immediate: true })

// 初次加载：若已有报名则默认折叠，否则展开
watch(() => props.myRegistration, (reg) => {
  if (!reg) {
    isEditing.value = true
  }
}, { immediate: true })

function handleSuccess(mobile: string) {
  isEditing.value = false
  emit('success', mobile)
}

function formatDuration(seconds: unknown) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0)
    return ''
  const m = Math.floor(value / 60)
  const s = value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// 将成员字符串（"原唱-昵称、原唱-昵称"）格式化为可读列表
function formatMembers(members: string | null | undefined) {
  if (!members?.trim())
    return ''
  return members.split('、').map((entry) => {
    const idx = entry.indexOf('-')
    if (idx === -1)
      return entry
    return `${entry.slice(0, idx)}-${entry.slice(idx + 1)}`
  }).join('、')
}
</script>

<template>
  <Card>
    <CardHeader class="px-3 pb-0 pt-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <CardTitle class="text-base">
            {{ props.myRegistration ? '我的报名信息' : '活动报名' }}
          </CardTitle>
        </div>
        <Badge :variant="props.myRegistration ? 'default' : 'secondary'">
          {{ props.myRegistration ? '已报名' : '可报名' }}
        </Badge>
      </div>
    </CardHeader>

    <CardContent class="px-3 pb-3 pt-0">
      <!-- 已报名 + 折叠态：摘要视图 -->
      <div v-if="props.myRegistration && !isEditing" class="space-y-3">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-md bg-muted/50 px-2 py-1.5">
            <div class="text-xs text-muted-foreground">
              队伍
            </div>
            <div class="truncate font-medium">
              {{ props.myRegistration.teamName || '未填写' }}
            </div>
          </div>
          <div class="rounded-md bg-muted/50 px-2 py-1.5">
            <div class="text-xs text-muted-foreground">
              歌曲
            </div>
            <div class="truncate font-medium">
              {{ props.myRegistration.songName || '未填写' }}
            </div>
          </div>
          <div v-if="props.myRegistration.songDuration" class="rounded-md bg-muted/50 px-2 py-1.5">
            <div class="text-xs text-muted-foreground">
              时长
            </div>
            <div class="font-mono font-medium">
              {{ formatDuration(props.myRegistration.songDuration) }}
            </div>
          </div>
          <div v-if="props.myRegistration.members" class="col-span-2 rounded-md bg-muted/50 px-2 py-1.5">
            <div class="text-xs text-muted-foreground">
              组员
            </div>
            <div class="text-sm font-medium">
              {{ formatMembers(props.myRegistration.members) }}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" class="h-8 w-full mb-2" @click="isEditing = true">
          <Pencil class="mr-1 h-3.5 w-3.5" />
          编辑报名信息
        </Button>
        <Button variant="destructive" size="sm" class="h-8 w-full" @click="emit('delete')">
          删除报名
        </Button>
      </div>

      <!-- 未报名 或 编辑态：完整表单 -->
      <div v-else>
        <RegistrationForm
          :key="props.registrationFormKey"
          :activity-code="props.activityCode"
          :initial-data="props.myRegistration"
          :default-mobile="props.currentMobile"
          :lock-mobile="!!props.currentMobile"
          @success="handleSuccess"
        />

        <!-- 编辑态：取消按钮 -->
        <Button
          v-if="props.myRegistration && isEditing"
          variant="ghost"
          size="sm"
          class="mt-2 h-8 w-full"
          @click="isEditing = false"
        >
          取消编辑
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
