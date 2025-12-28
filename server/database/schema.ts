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
  title: text('title').notNull(),
  description: text('description'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  maxParticipants: integer('max_participants').notNull(), // 最大座位数
  creatorId: integer('creator_id').references(() => users.id),
  status: text('status').default('published'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const activitySeats = sqliteTable('activity_seats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activityId: integer('activity_id').references(() => activities.id).notNull(),
  seatNumber: integer('seat_number').notNull(), // 座位号 (1, 2, 3...)
  userId: integer('user_id').references(() => users.id), // 占用该座位的用户，为空则表示未被抢占
  remark: text('remark'), // 用户备注信息
  occupiedAt: integer('occupied_at', { mode: 'timestamp' }), // 抢占时间
}, t => ({
  // 确保同一活动下座位号唯一
  uniqueActivitySeat: unique().on(t.activityId, t.seatNumber),
}))
