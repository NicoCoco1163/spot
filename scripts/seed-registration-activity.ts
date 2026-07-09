import process from 'node:process'
import { config } from 'dotenv'

config()

const registrationCount = 50

function buildMobile(runId: number, index: number) {
  const runPart = String(runId % 1000000).padStart(6, '0')
  const indexPart = String(index).padStart(2, '0')

  return `139${runPart}${indexPart}`
}

function buildRegistration(index: number, mobile: string) {
  return {
    mobile,
    teamName: `测试报名队伍 ${index}`,
    songName: `测试报名曲目 ${index}`,
    songDuration: 180 + (index % 60),
    members: [
      `队长${index}`,
      `队员${index}-1`,
      `队员${index}-2`,
      `队员${index}-3`,
    ].join('、'),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

async function main() {
  const [
    { activities, registrationDevices, registrations },
    { createUniqueActivityCode },
    { db },
  ] = await Promise.all([
    import('../server/database/schema'),
    import('../server/utils/activity-code'),
    import('../server/utils/db'),
  ])
  const runId = Date.now()

  const result = db.transaction((tx) => {
    const activity = tx.insert(activities)
      .values({
        code: createUniqueActivityCode(),
        title: `测试报名中活动 ${new Date().toLocaleString('zh-CN')}`,
        description: '脚本生成：报名中活动，含 50 条报名信息。',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'published',
      })
      .returning()
      .get()

    const registrationRows = Array.from({ length: registrationCount }, (_, i) => {
      const index = i + 1
      return {
        activityId: activity.id,
        ...buildRegistration(index, buildMobile(runId, index)),
      }
    })

    const insertedRegistrations = tx.insert(registrations)
      .values(registrationRows)
      .returning()
      .all()

    tx.insert(registrationDevices)
      .values(insertedRegistrations.map((registration, i) => ({
        activityId: activity.id,
        registrationId: registration.id,
        deviceKey: `seed-registration-${activity.code}-${String(i + 1).padStart(2, '0')}`,
      })))
      .run()

    return {
      activity,
      registrationCount: insertedRegistrations.length,
    }
  })

  console.log('报名中活动已生成')
  console.log(`活动 ID: ${result.activity.id}`)
  console.log(`活动码: ${result.activity.code}`)
  console.log(`报名数: ${result.registrationCount}`)
  console.log(`报名截止: ${result.activity.deadline.toISOString()}`)
}

main().catch((error) => {
  console.error('生成报名中活动失败:', error)
  process.exit(1)
})
