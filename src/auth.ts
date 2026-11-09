// The login token from /api/login, saved on this device.
import { useSyncExternalStore } from 'react'

const KEY = 'studyapp.token'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

let token = read()

function set(next: string | null) {
  token = next
  try {
    if (next) localStorage.setItem(KEY, next)
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the token still works until the app is closed.
  }
  listeners.forEach((l) => l())
}

export function getToken(): string | null {
  return token
}

// The name stored inside the token. The app only reads it; the server checks
// the token's signature.
export function nameFromToken(value: string | null): string {
  if (!value) return ''
  try {
    const part = value.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(part), (c) => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    return typeof payload.name === 'string' ? payload.name : ''
  } catch {
    return ''
  }
}

export function useAuth() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => token,
  )
  return { token: current, name: nameFromToken(current) }
}

export class LoginError extends Error {}

export async function createAccount(name: string, code: string): Promise<void> {
  if (!navigator.onLine) {
    throw new LoginError('You’re offline. Connect to the internet to create your account.')
  }
  let response: Response
  try {
    response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, code }),
    })
  } catch {
    throw new LoginError('Couldn’t reach the server. Check your connection and try again.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok || typeof body?.token !== 'string') {
    throw new LoginError(body?.error ?? `Something went wrong on the server (error ${response.status}).`)
  }
  // Open on Home after creating an account.
  window.history.replaceState(null, '', '/')
  set(body.token)
}

// Signing out removes the token only. Classes and files stay on the device.
export function signOut() {
  set(null)
}
