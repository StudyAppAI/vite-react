import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import LessonView from '../components/LessonView.tsx'
import { db } from '../db.ts'
import { useIdParam } from '../hooks.ts'

interface Props {
  // "class": /classes/:classId/learn/:folderId   "learn": /learn/:classId/:folderId
  from: 'class' | 'learn'
}

// Both routes show the same LessonView for the folder's single lesson.
export default function LessonScreen({ from }: Props) {
  const classId = useIdParam('classId')
  const folderId = useIdParam('folderId')
  const folder = useLiveQuery(() => db.folders.get(folderId), [folderId], null)

  const back =
    from === 'class'
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
      <LessonView folderId={folderId} classId={classId} />
    </>
  )
}
