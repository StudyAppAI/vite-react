import { useRef, useState, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'

interface Props {
  value: string
  onSave: (name: string) => Promise<void> | void
  // What is being renamed, for screen readers, e.g. "class", "folder".
  what: string
  className?: string
  // Return false to ignore a tap (e.g. right after a drag).
  canEdit?: () => boolean
}

// A name you tap to rename. The tap turns it into a text box with the name
// selected; Return or tapping away saves, Escape cancels.
export default function EditableName({ value, onSave, what, className = 'editable-name', canEdit }: Props) {
  const [editing, setEditing] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const start = () => {
    if (canEdit && !canEdit()) return
    // flushSync keeps the focus inside the tap so the iPhone keyboard opens.
    flushSync(() => setEditing(true))
    input.current?.focus()
    input.current?.select()
  }

  const save = async (text: string) => {
    setEditing(false)
    const name = text.trim()
    if (name && name !== value) await onSave(name)
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      e.currentTarget.value = value
      e.currentTarget.blur()
    }
  }

  if (editing) {
    return (
      <input
        ref={input}
        className="name-input"
        defaultValue={value}
        aria-label={`${what[0].toUpperCase()}${what.slice(1)} name`}
        enterKeyHint="done"
        autoComplete="off"
        onBlur={(e) => save(e.currentTarget.value)}
        onKeyDown={onKey}
        onPointerDown={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <button type="button" className={className} title="Tap to rename" aria-label={`Rename ${value}`} onClick={start}>
      {value}
    </button>
  )
}
