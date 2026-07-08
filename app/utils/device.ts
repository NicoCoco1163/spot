const deviceKeyStorageKey = 'spot_browser_device_key'

function createRandomDeviceKey() {
  const crypto = globalThis.crypto
  if (crypto?.randomUUID)
    return crypto.randomUUID()

  const bytes = new Uint8Array(16)
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  else {
    for (let index = 0; index < bytes.length; index++)
      bytes[index] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function getOrCreateBrowserDeviceKey() {
  if (!import.meta.client)
    return ''

  const existing = localStorage.getItem(deviceKeyStorageKey)
  if (existing)
    return existing

  const deviceKey = createRandomDeviceKey()
  localStorage.setItem(deviceKeyStorageKey, deviceKey)
  return deviceKey
}
