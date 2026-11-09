import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation } from 'react-router-dom'
import Header from '../components/Header.tsx'
import LessonView from '../components/LessonView.tsx'
import { db } from '../db.ts'
import { useIdParam } from '../hooks.ts'

// The one lesson screen, shown at /classes/:classId/learn/:folderId and at
// /learn/:classId/:folderId. Only the back link differs.
export default function LessonScreen() {
  const classId = useIdParam('classId')
  const folderId = useIdParam('folderId')
  const fromClass = useLocation().pathname.startsWith('/classes/')
  const folder = useLiveQuery(() => db.folders.get(folderId), [folderId], null)

  const back = fromClass
    ? { to: `/classes/${classId}/learn`, label: 'Learn' }
    : { to: `/learn/${classId}`, label: 'Folders' }

  if (folder === null) return null
  if (folder === undefined || folder.classId !== classId) {
    return (
      <>
        <Header back={back} title="Not found" />
        <p className="empty">This folder no longer exists.</p>
      </>
    )
  }

  return (
    <>
      <Header back={back} title={folder.name} />
      <LessonView folderId={folderId} />
    </>
  )
}
