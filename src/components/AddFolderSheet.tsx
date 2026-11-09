import { useEffect, useState, type FormEvent } from 'react'
import Sheet from './Sheet.tsx'
import { addFolder, nextWeekNumber, type FolderType } from '../db.ts'

interface Props {
  classId: number
  onClose: () => void
}

// Step 1: Week or Topic? Step 2: the folder's name.
export default function AddFolderSheet({ classId, onClose }: Props) {
  const [type, setType] = useState<FolderType | null>(null)
  const [name, setName] = useState('')
  const [weekNumber, setWeekNumber] = useState(1)

  useEffect(() => {
    nextWeekNumber(classId).then(setWeekNumber)
  }, [classId])

  const choose = (t: FolderType) => {
    setType(t)
    setName(t === 'week' ? `Week ${weekNumber}` : '')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!type || !trimmed) return
    await addFolder(classId, type, trimmed)
    onClose()
  }

  if (type === null) {
    return (
      <Sheet title="New folder" onClose={onClose}>
        <div className="sheet-body">
          <p className="sheet-question">Is this folder a week or a topic?</p>
          <div className="choice-grid">
            <button className="choice" onClick={() => choose('week')}>
              <span className="badge week">{weekNumber}</span>
              <span className="choice-title">Week</span>
              <span className="row-detail">e.g. Week {weekNumber}</span>
            </button>
            <button className="choice" onClick={() => choose('topic')}>
              <span className="badge topic">T</span>
              <span className="choice-title">Topic</span>
              <span className="row-detail">e.g. Recursion</span>
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={type === 'week' ? 'New week' : 'New topic'} onClose={onClose}>
      <form onSubmit={submit} className="sheet-body">
        <label className="sheet-question" htmlFor="folder-name">
          What should this {type} be called?
        </label>
        <input
          id="folder-name"
          className="text-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'week' ? `Week ${weekNumber}` : 'Recursion'}
          autoComplete="off"
          enterKeyHint="done"
          autoFocus
        />
        <button type="submit" className="primary block" disabled={!name.trim()}>
          Add {type}
        </button>
        <button type="button" className="text-button" onClick={() => setType(null)}>
          ‹ Back
        </button>
      </form>
    </Sheet>
  )
}
