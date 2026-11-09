import { useEffect, useState, type FormEvent } from 'react'
import Sheet from './Sheet.tsx'
import { addFolder, nextWeekNumber, type FolderType } from '../db.ts'

interface Props {
  classId: number
  onClose: () => void
}

export default function AddFolderSheet({ classId, onClose }: Props) {
  const [type, setType] = useState<FolderType>('week')
  const [name, setName] = useState('')
  const [weekName, setWeekName] = useState('Week 1')

  useEffect(() => {
    nextWeekNumber(classId).then((n) => {
      setWeekName(`Week ${n}`)
      setName((current) => current || `Week ${n}`)
    })
  }, [classId])

  const choose = (t: FolderType) => {
    setType(t)
    setName(t === 'week' ? weekName : '')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await addFolder(classId, type, trimmed)
    onClose()
  }

  return (
    <Sheet title="New folder" onClose={onClose}>
      <form onSubmit={submit} className="sheet-body">
        <div className="segmented" role="radiogroup" aria-label="Folder type">
          {(['week', 'topic'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className={type === t ? 'on' : ''}
              onClick={() => choose(t)}
            >
              {t === 'week' ? 'Week' : 'Topic'}
            </button>
          ))}
        </div>
        <input
          className="text-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'week' ? 'Week 3' : 'Recursion'}
          aria-label="Folder name"
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" className="primary block" disabled={!name.trim()}>
          Add folder
        </button>
      </form>
    </Sheet>
  )
}
