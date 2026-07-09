import process from 'node:process'
import { Database } from 'bun:sqlite'
import { config } from 'dotenv'

config()

const shouldConfirm = process.argv.includes('--yes')
const databaseUrl = process.env.DATABASE_URL || 'sqlite.db'

if (!shouldConfirm) {
  console.error('该脚本会清空所有活动、报名、设备限制和占座数据。')
  console.error('管理员用户不会被删除。')
  console.error('确认执行请运行：bun run clear:activities -- --yes')
  process.exit(1)
}

const sqlite = new Database(databaseUrl, {
  create: true,
  readwrite: true,
})

sqlite.exec('PRAGMA foreign_keys = ON')

type CountRow = {
  count: number
}

function countRows(tableName: string) {
  return sqlite
    .query<CountRow, []>(`SELECT COUNT(*) AS count FROM ${tableName}`)
    .get()!
    .count
}

const before = {
  activities: countRows('activities'),
  registrations: countRows('registrations'),
  registrationDevices: countRows('registration_devices'),
  activitySeats: countRows('activity_seats'),
}

sqlite.transaction(() => {
  sqlite.run('DELETE FROM activity_seats')
  sqlite.run('DELETE FROM registration_devices')
  sqlite.run('DELETE FROM registrations')
  sqlite.run('DELETE FROM activities')

  sqlite.run(`
    DELETE FROM sqlite_sequence
    WHERE name IN (
      'activities',
      'registrations',
      'registration_devices',
      'activity_seats'
    )
  `)
})()

const foreignKeyViolations = sqlite
  .query('PRAGMA foreign_key_check')
  .all()

if (foreignKeyViolations.length > 0) {
  console.error('清空后发现外键违规：')
  console.error(foreignKeyViolations)
  process.exit(1)
}

console.log(`活动数据已清空：${databaseUrl}`)
console.log(`活动：${before.activities} -> ${countRows('activities')}`)
console.log(`报名：${before.registrations} -> ${countRows('registrations')}`)
console.log(`设备限制：${before.registrationDevices} -> ${countRows('registration_devices')}`)
console.log(`占座：${before.activitySeats} -> ${countRows('activity_seats')}`)
