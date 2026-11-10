import { useRef, useState, type FormEvent } from 'react'
import Sheet from './Sheet.tsx'

interface Props {
  title: string
  label: string
  initial?: string
  placeholder?: string
  submitLabel: string
  // Tap-to-fill ideas shown under the field, e.g. "Week 3".
  suggestions?: string[]
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
  suggestions = [],
  onSubmit,
  onClose,
}: Props) {
  const [name, setName] = useState(initial)
  const input = useRef<HTMLInputElement>(null)

  const fill = (value: string) => {
    setName(value)
    // Keep the keyboard up and put the cursor at the end, so the user can
    // keep typing, e.g. "Topic: |". Focus must happen during the tap on iPhone.
    input.current?.focus()
    requestAnimationFrame(() => {
      const end = input.current?.value.length ?? value.length
      input.current?.setSelectionRange(end, end)
    })
  }

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
          ref={input}
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
        {suggestions.length > 0 && (
          <div className="suggestions" aria-label="Suggestions">
            <span className="suggestions-label">Suggestions:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                // Stops the chip taking focus from the name field.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => fill(s)}
              >
                {s.trim()}
              </button>
            ))}
          </div>
        )}
        <button type="submit" className="primary block" disabled={!name.trim()}>
          {submitLabel}
        </button>
      </form>
    </Sheet>
  )
}
