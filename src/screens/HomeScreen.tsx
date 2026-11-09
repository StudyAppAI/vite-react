import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addClass, db } from '../db.ts'

interface Props {
  onOpenClass: (id: number) => void
}

export default function HomeScreen({ onOpenClass }: Props) {
  const [name, setName] = useState('')
  const classes = useLiveQuery(() => db.classes.orderBy('createdAt').toArray())
  const weekCounts = useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.weeks.each((w) => counts.set(w.classId, (counts.get(w.classId) ?? 0) + 1))
    return counts
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    await addClass(trimmed)
  }

  return (
    <div className="screen">
      <header className="large-header">
        <h1>Classes</h1>
      </header>

      <form className="add-form" onSubmit={submit}>
        <input
          type="text"
          placeholder="New class name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          enterKeyHint="done"
          autoComplete="off"
          aria-label="New class name"
        />
        <button type="submit" className="primary" disabled={!name.trim()}>
          Add
        </button>
      </form>

      {classes === undefined ? null : classes.length === 0 ? (
        <p className="empty">No classes yet. Add your first class above.</p>
      ) : (
        <ul className="list">
          {classes.map((c) => {
            const count = weekCounts?.get(c.id) ?? 0
            return (
              <li key={c.id}>
                <button className="row" onClick={() => onOpenClass(c.id)}>
                  <span className="row-title">{c.name}</span>
                  <span className="row-detail">
                    {count} {count === 1 ? 'week' : 'weeks'}
                  </span>
                  <span className="chevron" aria-hidden="true">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
