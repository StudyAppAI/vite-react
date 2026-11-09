import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { addWeek, db, deleteClass, deleteWeek } from '../db.ts'

interface Props {
  classId: number
  onBack: () => void
}

export default function ClassScreen({ classId, onBack }: Props) {
  const [editing, setEditing] = useState(false)
  // null while loading, undefined when the class does not exist
  const studyClass = useLiveQuery(() => db.classes.get(classId), [classId], null)
  const weeks = useLiveQuery(
    () =>
      db.weeks
        .where('[classId+number]')
        .between([classId, Dexie.minKey], [classId, Dexie.maxKey])
        .toArray(),
    [classId],
  )

  const removeWeek = async (weekId: number, number: number) => {
    if (window.confirm(`Delete Week ${number} and everything in it?`)) {
      await deleteWeek(weekId)
    }
  }

  const removeClass = async () => {
    if (!studyClass) return
    if (window.confirm(`Delete "${studyClass.name}" and all of its weeks?`)) {
      await deleteClass(classId)
      onBack()
    }
  }

  if (studyClass === null) return <div className="screen" />

  return (
    <div className="screen">
      <nav className="nav-bar">
        <button className="nav-button" onClick={onBack}>
          <span className="back-chevron" aria-hidden="true">‹</span> Classes
        </button>
        {studyClass && (
          <button className="nav-button" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </nav>

      {studyClass === undefined ? (
        <p className="empty">This class no longer exists.</p>
      ) : (
        <>
          <header className="large-header">
            <h1>{studyClass.name}</h1>
          </header>

          <button className="primary block" onClick={() => addWeek(classId)}>
            + Add Week
          </button>

          {weeks === undefined ? null : weeks.length === 0 ? (
            <p className="empty">No weeks yet. Tap “Add Week” to create Week 1.</p>
          ) : (
            <ul className="list">
              {weeks.map((w) => (
                <li key={w.id}>
                  <div className="row">
                    <span className="week-badge">{w.number}</span>
                    <span className="row-title">Week {w.number}</span>
                    {editing && (
                      <button
                        className="delete-button"
                        onClick={() => removeWeek(w.id, w.number)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {editing && (
            <button className="danger block" onClick={removeClass}>
              Delete Class
            </button>
          )}
        </>
      )}
    </div>
  )
}
