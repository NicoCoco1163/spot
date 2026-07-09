import process from 'node:process'
import { jwtVerify, SignJWT } from 'jose'

// 密码相关
export async function hashPassword(password: string) {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
  })
}

export async function verifyPassword(hash: string, password: string) {
  try {
    return await Bun.password.verify(password, hash)
  }
  catch {
    return false
  }
}

// JWT 相关
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-it-in-prod')

export async function createToken(payload: object) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7天过期
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  }
  catch {
    return null
  }
}

// Cookie 配置常量
export const AUTH_COOKIE_NAME = 'auth_token'
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7天
}
