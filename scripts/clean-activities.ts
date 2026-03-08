import process from 'node:process'
import readline from 'node:readline'
import { and, eq, inArray, lt, or } from 'drizzle-orm'
import { activities, activitySeats, registrations } from '../server/database/schema'
import { db } from '../server/utils/db'

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => rl.question(query, (ans) => {
    rl.close()
    resolve(ans)
  }))
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] // 'all' or 'ended'

  if (!mode || !['all', 'ended'].includes(mode)) {
    console.error('Usage: npx tsx scripts/clean-activities.ts <all|ended>')
    process.exit(1)
  }

  const answer = await askQuestion(`Are you sure you want to delete ${mode === 'all' ? 'ALL' : 'ENDED'} activities and related data? This cannot be undone. (y/N): `)

  if (answer.toLowerCase() !== 'y') {
    console.log('Operation cancelled.')
    process.exit(0)
  }

  console.log(`Starting cleanup in mode: ${mode}...`)

  try {
    if (mode === 'all') {
      // Delete all data
      console.log('Deleting all activity seats...')
      await db.delete(activitySeats)

      console.log('Deleting all registrations...')
      await db.delete(registrations)

      console.log('Deleting all activities...')
      await db.delete(activities)
    }
    else if (mode === 'ended') {
      // Find ended activities
      const now = new Date()
      const endedActivities = await db.select({ id: activities.id })
        .from(activities)
        .where(
          or(
            lt(activities.endTime, now),
            eq(activities.status, 'completed'), // Assuming 'completed' is a status
            eq(activities.status, 'cancelled'), // Assuming 'cancelled' is a status
          ),
        )

      const activityIds = endedActivities.map(a => a.id)

      if (activityIds.length === 0) {
        console.log('No ended activities found.')
        process.exit(0)
      }

      console.log(`Found ${activityIds.length} ended activities (IDs: ${activityIds.join(', ')}). Deleting related data...`)

      // Delete seats for these activities
      console.log('Deleting related activity seats...')
      await db.delete(activitySeats)
        .where(inArray(activitySeats.activityId, activityIds))

      // Delete registrations for these activities
      console.log('Deleting related registrations...')
      await db.delete(registrations)
        .where(inArray(registrations.activityId, activityIds))

      // Delete activities themselves
      console.log('Deleting ended activities...')
      await db.delete(activities)
        .where(inArray(activities.id, activityIds))
    }

    console.log('Cleanup completed successfully.')
    process.exit(0)
  }
  catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  }
}

main()
