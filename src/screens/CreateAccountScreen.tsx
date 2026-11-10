import { useState, type FormEvent } from 'react'
import { createAccount } from '../auth.ts'
import { useOnline } from '../useOnline.ts'

// Shown on first launch, and after signing out.
export default function CreateAccountScreen() {
  const online = useOnline()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createAccount(name.trim(), code.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen account-gate">
      <img className="gate-icon" src="/icon.svg" alt="" width={72} height={72} />
      <h1>Create account</h1>
      <p className="subtitle">
        Enter your name and the access code you were given. Capital and small letters both work.
      </p>

      <form className="gate-form" onSubmit={submit}>
        <label className="field-label" htmlFor="gate-name">
          Name
        </label>
        <input
          id="gate-name"
          className="text-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Your name"
        />
        <label className="field-label" htmlFor="gate-code">
          Access code
        </label>
        <input
          id="gate-code"
          className="text-input"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. K7Q2-ALPHA"
        />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {!online && <p className="generate-note">You’re offline. Connect to the internet to create your account.</p>}
        <button type="submit" className="primary block" disabled={busy || !name.trim() || !code.trim() || !online}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  )
}
