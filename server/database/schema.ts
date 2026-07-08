import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openid: text('openid').unique(), // 微信 OpenID，用于默认登录
  mobile: text('mobile').unique(), // 手机号，用于账号密码登录
  nickname: text('nickname'), // 用户昵称
  password: text('password'), // 密码 (建议加密存储)
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false), // 管理员标记
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  deadline: integer('deadline', { mode: 'timestamp' }).notNull(), // 报名截止时间
  creatorId: integer('creator_id').references(() => users.id),
  status: text('status').default('published'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// 报名表：用户在活动中的报名信息
export const registrations = sqliteTable('registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activityId: integer('activity_id').references(() => activities.id).notNull(),
  mobile: text('mobile').notNull(),
  teamName: text('team_name'), // 队伍名称
  songName: text('song_name'), // 歌曲名称
  songDuration: integer('song_duration'), // 歌曲时长（秒）
  members: text('members'), // 成员（纯文本）
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, t => ({
  // 每手机号每活动仅一条报名
  uniqueActivityMobile: unique().on(t.activityId, t.mobile),
}))

// 浏览器设备报名软限制：同一活动内，一个浏览器设备标识只能绑定一条报名
export const registrationDevices = sqliteTable('registration_devices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activityId: integer('activity_id').references(() => activities.id).notNull(),
  registrationId: integer('registration_id').references(() => registrations.id).notNull(),
  deviceKey: text('device_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, t => ({
  uniqueActivityDevice: unique().on(t.activityId, t.deviceKey),
}))

export const activitySeats = sqliteTable('activity_seats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activityId: integer('activity_id').references(() => activities.id).notNull(),
  seatNumber: integer('seat_number').notNull(), // 座位号 (1, 2, 3...)
  mobile: text('mobile'), // 占用该座位的手机号，为空则表示未被抢占
  registrationId: integer('registration_id').references(() => registrations.id), // 关联的报名记录
  remark: text('remark'), // 用户备注信息
  occupiedAt: integer('occupied_at', { mode: 'timestamp' }), // 抢占时间
}, t => ({
  // 确保同一活动下座位号唯一
  uniqueActivitySeat: unique().on(t.activityId, t.seatNumber),
}))
