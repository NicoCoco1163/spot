import { createHash, createHmac, randomBytes } from 'node:crypto'

const MAX_NUMBER = 100000

interface Challenge {
  algorithm: string
  challenge: string
  maxnumber: number
  salt: string
  signature: string
}

function generateChallenge(hmacKey: string): Challenge {
  const salt = randomBytes(12).toString('hex')
  const secretNumber = Math.floor(Math.random() * MAX_NUMBER)
  const challenge = createHash('sha256')
    .update(salt + secretNumber.toString())
    .digest('hex')
  const signature = createHmac('sha256', hmacKey)
    .update(challenge)
    .digest('hex')

  return {
    algorithm: 'SHA-256',
    challenge,
    maxnumber: MAX_NUMBER,
    salt,
    signature,
  }
}

export default defineEventHandler(async (event): Promise<Challenge> => {
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Access-Control-Allow-Methods', 'GET')
  setHeader(event, 'Content-Type', 'application/json')

  const hmacKey = useRuntimeConfig().altchaHmacKey || ''

  try {
    return generateChallenge(hmacKey)
  }
  catch {
    throw createError({
      statusCode: 500,
      statusMessage: '生成挑战失败',
    })
  }
})
