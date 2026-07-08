export const mainlandMobilePattern = /^1(?:3\d|4[5-9]|5[0-35-9]|6[2567]|7[0-35-8]|8\d|9[0-35-9])\d{8}$/

export function normalizeMobile(value: string) {
  return value.trim().replace(/\s+/g, '')
}

export function isMainlandMobile(value: string) {
  return mainlandMobilePattern.test(normalizeMobile(value))
}
