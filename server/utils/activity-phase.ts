import type { activities } from '../database/schema'

export type Activity = typeof activities.$inferSelect

export type ActivityPhase = 'registration' | 'booking'

/**
 * 判断当前活动阶段
 * @param activity 活动对象
 * @returns 'registration' - 报名阶段 | 'booking' - 抢座阶段
 */
export function getActivityPhase(activity: Activity): ActivityPhase {
  // 如果没有设置报名截止时间，直接进入抢座阶段（兼容旧数据）
  if (!activity.registrationDeadline) {
    return 'booking'
  }

  const now = new Date()
  const deadline = new Date(activity.registrationDeadline)

  // 当前时间在截止时间之前 -> 报名阶段
  if (now < deadline) {
    return 'registration'
  }

  // 当前时间在截止时间之后 -> 抢座阶段
  return 'booking'
}

/**
 * 判断是否可以报名
 * @param activity 活动对象
 * @returns true - 可以报名
 */
export function canRegister(activity: Activity): boolean {
  // 活动状态检查
  if (activity.status === 'cancelled' || activity.status === 'completed') {
    return false
  }

  return getActivityPhase(activity) === 'registration'
}

/**
 * 判断是否可以抢座
 * @param activity 活动对象
 * @returns true - 可以抢座
 */
export function canOccupySeat(activity: Activity): boolean {
  // 活动状态检查
  if (activity.status === 'cancelled' || activity.status === 'completed') {
    return false
  }

  return getActivityPhase(activity) === 'booking'
}

/**
 * 获取距离报名截止的剩余时间（毫秒）
 * @param activity 活动对象
 * @returns 剩余时间（毫秒），如果已过期或未设置返回 0
 */
export function getTimeUntilDeadline(activity: Activity): number {
  if (!activity.registrationDeadline) {
    return 0
  }

  const now = new Date()
  const deadline = new Date(activity.registrationDeadline)
  const diff = deadline.getTime() - now.getTime()

  return Math.max(0, diff)
}

/**
 * 格式化剩余时间
 * @param ms 毫秒数
 * @returns 格式化的时间字符串
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) {
    return '已截止'
  }

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天${hours % 24}小时`
  }
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分钟`
  }
  return `${seconds}秒`
}