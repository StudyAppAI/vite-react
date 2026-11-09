import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import { db, deleteClass } from '../db.ts'
import { plural, useClass, useIdParam } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'

export default function ClassScreen() {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const counts = useLiveQuery(
    async () => ({
      folders: await db.folders.where('classId').equals(classId).count(),
      cards: await db.flashcards.where('classId').equals(classId).count(),
      lessons: await db.lessons.where('classId').equals(classId).count(),
    }),
    [classId],
  )

  if (studyClass === null) return null
  if (studyClass === undefined) return <MissingClass />

  const remove = async () => {
    if (window.confirm(`Delete “${studyClass.name}” and everything in it?`)) {
      await deleteClass(classId)
      navigate('/classes', { replace: true })
    }
  }

  return (
    <>
      <Header
        back={{ to: '/classes', label: 'Classes' }}
        title={studyClass.name}
        right={
          <button className="nav-button" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        }
      />

      <ul className="list">
        <li>
          <Link className="row tall" to={`/classes/${classId}/content`}>
            <span className="row-icon content" aria-hidden="true">📂</span>
            <span className="row-text">
              <span className="row-title">Course Content</span>
              <span className="row-detail">Syllabus · {plural(counts?.folders ?? 0, 'folder')}</span>
            </span>
            <span className="chevron" aria-hidden="true">›</span>
          </Link>
        </li>
        <li>
          <Link className="row tall" to={`/classes/${classId}/review`}>
            <span className="row-icon review" aria-hidden="true">🃏</span>
            <span className="row-text">
              <span className="row-title">Review</span>
              <span className="row-detail">Flashcards · {plural(counts?.cards ?? 0, 'card')}</span>
            </span>
            <span className="chevron" aria-hidden="true">›</span>
          </Link>
        </li>
        <li>
          <Link className="row tall" to={`/classes/${classId}/learn`}>
            <span className="row-icon learn" aria-hidden="true">💡</span>
            <span className="row-text">
              <span className="row-title">Learn</span>
              <span className="row-detail">Visual content · {plural(counts?.lessons ?? 0, 'lesson')}</span>
            </span>
            <span className="chevron" aria-hidden="true">›</span>
          </Link>
        </li>
      </ul>

      {editing && (
        <button className="danger block spaced" onClick={remove}>
          Delete class
        </button>
      )}
    </>
  )
}
