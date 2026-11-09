// Access codes and login tokens. Files in folders starting with "_" are not
// turned into API routes by Vercel.
//
// APP_ACCESS_CODES: comma-separated code:name pairs, e.g. "K7Q2-ALPHA:Tyler,M9X4-BETA:Sam"
// SESSION_SECRET: a long random string used to sign tokens

import { createHmac, timingSafeEqual } from 'node:crypto'

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

// The set of codes that are currently allowed.
export function allowedCodes(): Set<string> {
  const codes = new Set<string>()
  for (const pair of (process.env.APP_ACCESS_CODES ?? '').split(',')) {
    const code = normalizeCode(pair.split(':')[0] ?? '')
    if (code) codes.add(code)
  }
  return codes
}

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value) throw new ConfigError('SESSION_SECRET is not set on the server.')
  return value
}

export class ConfigError extends Error {}

function sign(payloadPart: string): string {
  return createHmac('sha256', secret()).update(payloadPart).digest('base64url')
}

export interface TokenPayload {
  code: string
  name: string
  iat: number
}

export function createToken(code: string, name: string): string {
  const payload: TokenPayload = { code: normalizeCode(code), name, iat: Date.now() }
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${payloadPart}.${sign(payloadPart)}`
}

// Returns the token's contents if the signature is right AND its code is
// still in APP_ACCESS_CODES. Otherwise returns null.
export function verifyToken(token: string): TokenPayload | null {
  const [payloadPart, signaturePart, extra] = token.split('.')
  if (!payloadPart || !signaturePart || extra !== undefined) return null

  const expected = Buffer.from(sign(payloadPart))
  const given = Buffer.from(signaturePart)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  let payload: TokenPayload
  try {
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof payload.code !== 'string' || typeof payload.name !== 'string') return null
  if (!allowedCodes().has(normalizeCode(payload.code))) return null
  return payload
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
