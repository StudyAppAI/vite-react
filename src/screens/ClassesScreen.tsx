import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import { addClass, db } from '../db.ts'
import { plural } from '../hooks.ts'

export default function ClassesScreen() {
  const [name, setName] = useState('')
  const classes = useLiveQuery(() => db.classes.orderBy('createdAt').toArray())
  const folderCounts = useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.folders.each((f) => counts.set(f.classId, (counts.get(f.classId) ?? 0) + 1))
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
    <>
      <Header title="Classes" />

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
          Add class
        </button>
      </form>

      {classes === undefined ? null : classes.length === 0 ? (
        <p className="empty">No classes yet. Add your first class above.</p>
      ) : (
        <ul className="list">
          {classes.map((c) => (
            <li key={c.id}>
              <Link className="row" to={`/classes/${c.id}`}>
                <span className="row-title">{c.name}</span>
                <span className="row-detail">{plural(folderCounts?.get(c.id) ?? 0, 'folder')}</span>
                <span className="chevron" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
