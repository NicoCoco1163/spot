<script setup lang="ts">
import { Loader2, Plus, X } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'
import { getOrCreateBrowserDeviceKey } from '~/utils/device'
import { isMainlandMobile, normalizeMobile } from '~/utils/mobile'

const props = defineProps<{
  activityCode: string
  initialData?: {
    mobile?: string | null
    teamName?: string | null
    songName?: string | null
    songDuration?: number | null
    members?: string | null
  } | null
  defaultMobile?: string
  lockMobile?: boolean
  requireDetails?: boolean
}>()

const emit = defineEmits<{
  success: [mobile: string]
}>()

const isSubmitting = ref(false)

// ===== Local state for split inputs =====
const songTitle = ref('')
const songArtist = ref('')

interface MemberRow {
  original: string
  nickname: string
}

const memberRows = ref<MemberRow[]>([{ original: '', nickname: '' }])

// 解析存储的 "歌曲名称-歌手" 回两个字段
function parseSongName(stored: string | null | undefined) {
  const value = (stored || '').trim()
  if (!value) {
    songTitle.value = ''
    songArtist.value = ''
    return
  }
  const idx = value.indexOf('-')
  if (idx === -1) {
    // 无分隔符兼容旧数据，整段作为歌曲名称
    songTitle.value = value
    songArtist.value = ''
  }
  else {
    songTitle.value = value.slice(0, idx).trim()
    songArtist.value = value.slice(idx + 1).trim()
  }
}

// 解析存储的成员（每行 "原唱-昵称"）回行数组
function parseMembers(stored: string | null | undefined) {
  const value = (stored || '').trim()
  if (!value) {
    memberRows.value = [{ original: '', nickname: '' }]
    return
  }
  const lines = value.split('、').filter(l => l.trim())
  memberRows.value = lines.map((line) => {
    const idx = line.indexOf('-')
    if (idx === -1)
      return { original: line.trim(), nickname: '' }
    return {
      original: line.slice(0, idx).trim(),
      nickname: line.slice(idx + 1).trim(),
    }
  })
  if (memberRows.value.length === 0)
    memberRows.value = [{ original: '', nickname: '' }]
}

// 组装最终的 songName
function buildSongName(): string {
  const t = songTitle.value.trim()
  const a = songArtist.value.trim()
  if (!t && !a)
    return ''
  if (!a)
    return t
  if (!t)
    return a
  return `${t}-${a}`
}

// 组装最终的 members
function buildMembers(): string {
  return memberRows.value
    .filter(r => r.original.trim() || r.nickname.trim())
    .map(r => `${r.original.trim()}-${r.nickname.trim()}`)
    .join('、')
}

function addMemberRow() {
  memberRows.value = [...memberRows.value, { original: '', nickname: '' }]
}

function removeMemberRow(index: number) {
  if (memberRows.value.length <= 1) {
    // 最后一行不清空而非删除
    memberRows.value = [{ original: '', nickname: '' }]
    return
  }
  memberRows.value = memberRows.value.filter((_, i) => i !== index)
}

// ===== Form =====
// songName / members 仅通过本地状态管理，不放在 zod schema 中
const formSchema = toTypedSchema(z.object({
  mobile: z.string({ required_error: '请输入手机号' }).refine(isMainlandMobile, '请输入有效的中国大陆手机号'),
  teamName: z.string({ required_error: '请输入队伍名称' }).trim().min(1, '请输入队伍名称').max(100, '队伍名称最多 100 字'),
  songDuration: z.preprocess(
    value => value === '' || value === null || value === undefined ? undefined : Number(value),
    z.number().int().positive('歌曲时长必须大于 0').max(36000, '歌曲时长过长').optional(),
  ),
}))

function getFormValues() {
  // 初次加载时解析已有数据到本地状态
  parseSongName(props.initialData?.songName)
  parseMembers(props.initialData?.members)

  return {
    mobile: props.initialData?.mobile || props.defaultMobile || '',
    teamName: props.initialData?.teamName || '',
    songDuration: props.initialData?.songDuration ?? undefined,
  }
}

const form = useForm({
  validationSchema: formSchema,
  initialValues: getFormValues(),
})

watch(() => [props.initialData, props.defaultMobile], () => {
  // 重置时同步解析本地状态
  parseSongName(props.initialData?.songName)
  parseMembers(props.initialData?.members)

  form.resetForm({
    values: {
      mobile: props.initialData?.mobile || props.defaultMobile || '',
      teamName: props.initialData?.teamName || '',
      songDuration: props.initialData?.songDuration ?? undefined,
    },
  })
}, { deep: true })

const onSubmit = form.handleSubmit(async (values) => {
  if (isSubmitting.value)
    return

  const songNameVal = buildSongName()
  const membersVal = buildMembers()

  // requireDetails 时歌曲名称必填
  if (props.requireDetails && !songTitle.value.trim()) {
    toast.error('请填写歌曲名称')
    return
  }

  // 组员格式校验：只要有原唱成员就必须有组员昵称，反之亦然
  for (const row of memberRows.value) {
    const o = row.original.trim()
    const n = row.nickname.trim()
    if ((o && !n) || (!o && n)) {
      toast.error('组员名称和昵称必须同时填写，或同时留空')
      return
    }
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/activities/registrations/register', {
      method: 'POST',
      body: {
        activityCode: props.activityCode,
        mobile: normalizeMobile(values.mobile),
        deviceKey: getOrCreateBrowserDeviceKey(),
        teamName: values.teamName?.trim() || undefined,
        songName: songNameVal || undefined,
        songDuration: values.songDuration || undefined,
        members: membersVal || undefined,
      },
    })
    toast.success(props.initialData ? '报名信息已更新' : '报名成功')
    emit('success', normalizeMobile(values.mobile))
  }
  catch (error: any) {
    toast.error(error.statusMessage || error.message || '操作失败')
  }
  finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <form class="space-y-3" @submit="onSubmit">
    <!-- 手机号 -->
    <FormField v-slot="{ componentField }" name="mobile">
      <FormItem v-if="!props.lockMobile">
        <FormLabel>
          手机号 <span class="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input
            type="tel"
            placeholder="请输入报名手机号"
            v-bind="componentField"
            class="h-8"
            :disabled="props.lockMobile"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
      <FormItem v-else>
        <input type="hidden" v-bind="componentField">
        <FormMessage />
      </FormItem>
    </FormField>

    <!-- 队伍名称 -->
    <FormField v-slot="{ componentField }" name="teamName">
      <FormItem>
        <FormLabel>
          队伍名称 <span class="text-destructive">*</span>
        </FormLabel>
        <FormControl>
          <Input type="text" placeholder="请输入队伍名称" v-bind="componentField" class="h-8" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <!-- 歌曲名称 / 歌手（双输入框） -->
    <div class="space-y-1.5">
      <Label>
        歌曲名称 <span v-if="props.requireDetails" class="text-destructive">*</span>
      </Label>
      <div class="grid grid-cols-2 gap-2">
        <Input
          v-model="songTitle"
          type="text"
          placeholder="歌曲名称"
          class="h-8"
        />
        <Input
          v-model="songArtist"
          type="text"
          placeholder="歌手"
          class="h-8"
        />
      </div>
    </div>

    <!-- 歌曲时长 -->
    <FormField v-slot="{ componentField }" name="songDuration">
      <FormItem>
        <FormLabel>
          歌曲时长
        </FormLabel>
        <FormControl>
          <DurationPicker v-bind="componentField" placeholder="选择歌曲时长（分:秒）" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <!-- 组员名称（动态行） -->
    <div class="space-y-2">
      <Label>组员名称</Label>
      <div
        v-for="(row, i) in memberRows"
        :key="i"
        class="flex items-center gap-2"
      >
        <Input
          v-model="row.original"
          type="text"
          placeholder="原唱成员"
          class="h-8 flex-1"
        />
        <Input
          v-model="row.nickname"
          type="text"
          placeholder="组员昵称"
          class="h-8 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          @click="removeMemberRow(i)"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="h-8 w-full"
        @click="addMemberRow"
      >
        <Plus class="mr-1 h-4 w-4" />
        添加组员
      </Button>
      <p class="text-sm text-muted-foreground">
        格式：原唱成员-组员昵称（例：HAERIN-小舞）
      </p>
    </div>

    <!-- 提交 -->
    <div class="pt-1">
      <Button type="submit" size="sm" class="h-8 w-full" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="w-5 h-5 mr-2 animate-spin" />
        {{ isSubmitting ? '提交中...' : (initialData ? '更新报名' : '立即报名') }}
      </Button>
    </div>
  </form>
</template>
