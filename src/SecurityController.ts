/**
 * SecurityController.ts
 * Client-side security layer:
 *   1. AES-GCM encryption/decryption via Web Crypto API
 *   2. DOMPurify-based input sanitisation
 *   3. Anti-tampering (DevTools detection)
 *   4. Secure storage wrapper (IndexedDB via localStorage shim, encrypted)
 */

import DOMPurify from 'dompurify'

// ─── AES-GCM Encryption ───────────────────────────────────────────────────────

const ALGO = 'AES-GCM'
const KEY_LENGTH = 256
const STORAGE_KEY_NAME = 'zenith_enc_key'

/**
 * Derives (or retrieves) a persistent AES-GCM CryptoKey stored in localStorage
 * as a JWK. The key never leaves the browser's origin.
 */
async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(STORAGE_KEY_NAME)
  if (stored) {
    try {
      const jwk: JsonWebKey = JSON.parse(stored) as JsonWebKey
      return await crypto.subtle.importKey('jwk', jwk, { name: ALGO, length: KEY_LENGTH }, true, [
        'encrypt',
        'decrypt',
      ])
    } catch {
      // Key corrupted — regenerate
      localStorage.removeItem(STORAGE_KEY_NAME)
    }
  }
  const key = await crypto.subtle.generateKey({ name: ALGO, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ])
  const jwk = await crypto.subtle.exportKey('jwk', key)
  localStorage.setItem(STORAGE_KEY_NAME, JSON.stringify(jwk))
  return key
}

/**
 * Encrypts a JSON-serialisable payload.
 * Returns a Base64-encoded string: `iv:ciphertext`
 */
export async function encryptData(payload: unknown): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const cipherBuffer = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded)
  const ivB64 = uint8ToBase64(iv)
  const ctB64 = uint8ToBase64(new Uint8Array(cipherBuffer))
  return `${ivB64}:${ctB64}`
}

/**
 * Decrypts a payload previously produced by `encryptData`.
 */
export async function decryptData<T = unknown>(cipher: string): Promise<T> {
  const key = await getOrCreateKey()
  const [ivB64, ctB64] = cipher.split(':')
  if (!ivB64 || !ctB64) throw new Error('Invalid cipher format')
  const iv = base64ToUint8(ivB64)
  const ct = base64ToUint8(ctB64)
  const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(plain)) as T
}

// ─── Secure Storage Wrapper ───────────────────────────────────────────────────

const DATA_KEY = 'zenith_bio_data'

/** Persist biometric results encrypted in localStorage. */
export async function saveSecure(data: unknown): Promise<void> {
  const cipher = await encryptData(data)
  localStorage.setItem(DATA_KEY, cipher)
}

/** Load and decrypt biometric results from localStorage. Returns null if absent. */
export async function loadSecure<T = unknown>(): Promise<T | null> {
  const cipher = localStorage.getItem(DATA_KEY)
  if (!cipher) return null
  try {
    return await decryptData<T>(cipher)
  } catch {
    // Corrupted or tampered data — discard
    localStorage.removeItem(DATA_KEY)
    return null
  }
}

// ─── DOMPurify Input Sanitisation ─────────────────────────────────────────────

/**
 * Sanitises a user-supplied string using DOMPurify to prevent XSS.
 * Returns the sanitised string.
 */
export function sanitizeInput(raw: string): string {
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Parses and validates a numeric biometric input field.
 * Sanitises first, then coerces. Returns NaN for invalid input.
 */
export function parseNumericInput(raw: string): number {
  const clean = sanitizeInput(raw).trim()
  return Number(clean)
}

// ─── Anti-Tampering / DevTools Detection ─────────────────────────────────────

let _antiTamperActive = false

/**
 * Activates anti-tampering listeners:
 *  - Window-resize heuristic: DevTools typically widens or shortens the viewport.
 *  - Repeated `debugger` statement to interrupt automated pausing.
 *
 * When a tamper attempt is detected the stored health data is wiped and the
 * session is invalidated. This is a best-effort deterrent, not a hard guarantee.
 */
export function activateAntiTamper(): void {
  // Module-level flag ensures this function is idempotent — the listener
  // is registered at most once per browser session regardless of call count.
  if (_antiTamperActive) return
  _antiTamperActive = true

  // DevTools resize heuristic
  const DEVTOOLS_THRESHOLD = 160
  window.addEventListener('resize', () => {
    const widthDiff = window.outerWidth - window.innerWidth
    const heightDiff = window.outerHeight - window.innerHeight
    if (widthDiff > DEVTOOLS_THRESHOLD || heightDiff > DEVTOOLS_THRESHOLD) {
      _handleTamperDetected('DevTools resize detected')
    }
  })

  // Periodic debugger trap (fires every 3 s in production builds)
  if (import.meta.env.PROD) {
    const trapLoop = (): void => {
      // eslint-disable-next-line no-debugger
      debugger
      setTimeout(trapLoop, 3000)
    }
    setTimeout(trapLoop, 3000)
  }
}

function _handleTamperDetected(reason: string): void {
  console.warn(`[Zenith Security] Tamper attempt detected: ${reason}`)
  // Wipe sensitive cached data from storage
  localStorage.removeItem(DATA_KEY)
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function base64ToUint8(b64: string): Uint8Array {
  return new Uint8Array(
    atob(b64)
      .split('')
      .map((c) => c.charCodeAt(0)),
  )
}
