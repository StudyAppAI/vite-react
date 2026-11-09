import { NavLink, Outlet } from 'react-router-dom'
import Header from '../components/Header.tsx'
import { useClass, useIdParam } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'
import type { ClassContext } from './classContext.ts'

// The class page: its name, then three tabs across the top
// (Course Content, Flashcards, Learn). Each tab is its own route.
export default function ClassLayout() {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)

  if (studyClass === null) return null
  if (studyClass === undefined) return <MissingClass />

  const base = `/classes/${classId}`

  return (
    <>
      <Header back={{ to: '/classes', label: 'Classes' }} title={studyClass.name} />
      <nav className="top-tabs" aria-label="Class sections">
        <NavLink to={`${base}/content`}>Course Content</NavLink>
        <NavLink to={`${base}/flashcards`}>Flashcards</NavLink>
        <NavLink to={`${base}/learn`}>Learn</NavLink>
      </nav>
      <Outlet context={{ studyClass } satisfies ClassContext} />
    </>
  )
}
