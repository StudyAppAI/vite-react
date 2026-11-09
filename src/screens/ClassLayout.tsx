import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Header from '../components/Header.tsx'
import { deleteClass } from '../db.ts'
import { useClass, useIdParam } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'
import type { ClassContext } from './classContext.ts'

// The class page: its name, then three tabs across the top
// (Course Content, Review, Learn). Each tab is its own route.
export default function ClassLayout() {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  if (studyClass === null) return null
  if (studyClass === undefined) return <MissingClass />

  const remove = async () => {
    if (window.confirm(`Delete “${studyClass.name}” and everything in it?`)) {
      await deleteClass(classId)
      navigate('/classes', { replace: true })
    }
  }

  const base = `/classes/${classId}`

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

      <nav className="top-tabs" aria-label="Class sections">
        <NavLink to={`${base}/content`}>Course Content</NavLink>
        <NavLink to={`${base}/review`}>Review</NavLink>
        <NavLink to={`${base}/learn`}>Learn</NavLink>
      </nav>

      <Outlet context={{ studyClass, editing } satisfies ClassContext} />

      {editing && (
        <button className="danger block spaced" onClick={remove}>
          Delete class
        </button>
      )}
    </>
  )
}
