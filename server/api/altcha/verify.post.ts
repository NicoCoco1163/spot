import { createHash, createHmac } from 'node:crypto'

interface VerifyRequest {
  algorithm: string
  challenge: string
  number: number
  salt: string
  signature: string
}

interface VerifyResponse {
  verified: boolean
  message?: string
}

function verifyChallenge(payload: VerifyRequest, hmacKey: string): boolean {
  const { algorithm, challenge, number, salt, signature } = payload

  if (algorithm !== 'SHA-256') {
    return false
  }

  const computedHash = createHash('sha256')
    .update(salt + number.toString())
    .digest('hex')

  if (computedHash !== challenge) {
    return false
  }

  const expectedSignature = createHmac('sha256', hmacKey)
    .update(challenge)
    .digest('hex')

  return signature === expectedSignature
}

export default defineEventHandler(async (event): Promise<VerifyResponse> => {
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Access-Control-Allow-Methods', 'POST')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
  setHeader(event, 'Content-Type', 'application/json')

  try {
    const body = await readBody(event)

    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少请求数据',
      })
    }

    let verifyData = body
    if (body.payload && typeof body.payload === 'object') {
      verifyData = body.payload
    }

    const requiredFields = ['algorithm', 'challenge', 'number', 'salt', 'signature']
    const missingFields = requiredFields.filter(field => !(field in verifyData))

    if (missingFields.length > 0) {
      return {
        verified: false,
        message: `缺少必需字段: ${missingFields.join(', ')}`,
      }
    }

    const hmacKey = useRuntimeConfig().altchaHmacKey || ''
    const isValid = verifyChallenge(verifyData, hmacKey)

    return {
      verified: isValid,
      message: isValid ? '验证成功' : '验证失败',
    }
  }
  catch {
    return {
      verified: false,
      message: '验证过程中发生错误',
    }
  }
})
