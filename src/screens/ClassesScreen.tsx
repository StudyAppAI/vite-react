import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import NameSheet from '../components/NameSheet.tsx'
import { addClass, db, deleteClass, renameClass, type StudyClass } from '../db.ts'
import { plural } from '../hooks.ts'

export default function ClassesScreen() {
  const classes = useLiveQuery(() => db.classes.orderBy('createdAt').toArray())
  const folderCounts = useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.folders.each((f) => counts.set(f.classId, (counts.get(f.classId) ?? 0) + 1))
    return counts
  })
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<StudyClass | null>(null)

  const remove = async (c: StudyClass) => {
    if (window.confirm(`Delete “${c.name}”? Its folders, content, flashcards and lessons will be deleted too.`)) {
      await deleteClass(c.id)
    }
  }

  return (
    <>
      <Header title="Classes" />
      <button className="primary block" onClick={() => setAdding(true)}>
        + Add class
      </button>

      {classes === undefined ? null : classes.length === 0 ? (
        <p className="empty">No classes yet. Tap “+ Add class” to add your first one.</p>
      ) : (
        <ul className="list spaced-list">
          {classes.map((c) => (
            <li key={c.id} className="managed-item">
              <Link className="row" to={`/classes/${c.id}`}>
                <span className="row-title strong">{c.name}</span>
                <span className="row-detail">{plural(folderCounts?.get(c.id) ?? 0, 'folder')}</span>
                <span className="chevron" aria-hidden="true">›</span>
              </Link>
              <div className="item-actions">
                <button onClick={() => setRenaming(c)}>Rename class</button>
                <button className="danger-text" onClick={() => remove(c)}>
                  Delete class
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <NameSheet
          title="New class"
          label="Class name"
          placeholder="e.g. CS 101"
          submitLabel="Add class"
          onSubmit={async (name) => {
            await addClass(name)
          }}
          onClose={() => setAdding(false)}
        />
      )}
      {renaming && (
        <NameSheet
          title="Rename class"
          label="Class name"
          initial={renaming.name}
          submitLabel="Save class name"
          onSubmit={(name) => renameClass(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      )}
    </>
  )
}
