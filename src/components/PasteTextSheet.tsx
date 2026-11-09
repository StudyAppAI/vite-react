import { useState, type FormEvent } from 'react'
import Sheet from './Sheet.tsx'

interface Props {
  title: string
  defaultName?: string
  onSave: (name: string, text: string) => Promise<void>
  onClose: () => void
}

// Paste text in as a named content item.
export default function PasteTextSheet({ title, defaultName = '', onSave, onClose }: Props) {
  const [name, setName] = useState(defaultName)
  const [text, setText] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !text.trim()) return
    await onSave(name.trim(), text.trim())
    onClose()
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="sheet-body">
        <label className="field-label" htmlFor="paste-name">
          Name
        </label>
        <input
          id="paste-name"
          className="text-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lecture 3 notes"
          autoComplete="off"
        />
        <label className="field-label" htmlFor="paste-text">
          Text
        </label>
        <textarea
          id="paste-text"
          className="text-area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your notes or reading here"
        />
        <button type="submit" className="primary block" disabled={!name.trim() || !text.trim()}>
          Save text
        </button>
      </form>
    </Sheet>
  )
}
