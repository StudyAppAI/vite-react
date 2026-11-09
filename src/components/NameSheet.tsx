import { useState, type FormEvent } from 'react'
import Sheet from './Sheet.tsx'

interface Props {
  title: string
  label: string
  initial?: string
  placeholder?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void> | void
  onClose: () => void
}

// A sheet that asks for one name: adding or renaming a class or folder.
export default function NameSheet({
  title,
  label,
  initial = '',
  placeholder,
  submitLabel,
  onSubmit,
  onClose,
}: Props) {
  const [name, setName] = useState(initial)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await onSubmit(trimmed)
    onClose()
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="sheet-body">
        <label className="field-label" htmlFor="name-field">
          {label}
        </label>
        <input
          id="name-field"
          className="text-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="done"
          autoFocus
        />
        <button type="submit" className="primary block" disabled={!name.trim()}>
          {submitLabel}
        </button>
      </form>
    </Sheet>
  )
}
