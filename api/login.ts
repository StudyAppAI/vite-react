// POST /api/login  { name, code }  →  { token, name }
import { ConfigError, allowedCodes, createToken, json, normalizeCode } from './_lib/auth.js'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(request: Request): Promise<Response> {
  let body: { name?: unknown; code?: unknown }
  try {
    body = (await request.json()) as { name?: unknown; code?: unknown }
  } catch {
    return json({ error: 'The request was not valid.' }, 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const code = typeof body.code === 'string' ? normalizeCode(body.code) : ''
  if (!name) return json({ error: 'Enter your name.' }, 400)
  if (name.length > 60) return json({ error: 'Use a name of 60 characters or fewer.' }, 400)
  if (!code) return json({ error: 'Enter your access code.' }, 400)

  try {
    const codes = allowedCodes()
    if (codes.size === 0) {
      throw new ConfigError('APP_ACCESS_CODES is not set, or has no codes in it. Add it in Vercel and redeploy.')
    }
    if (!codes.has(code)) {
      await wait(600) // slows down guessing
      return json({ error: 'That access code isn’t valid. Check it and try again.' }, 401)
    }
    return json({ token: createToken(code, name), name })
  } catch (e) {
    if (e instanceof ConfigError) return json({ error: `Server setup problem: ${e.message}` }, 500)
    throw e
  }
}
