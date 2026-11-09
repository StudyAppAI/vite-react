import Header from '../components/Header.tsx'
import FolderLessonList from '../components/FolderLessonList.tsx'
import { useClass, useIdParam } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'

// Bottom Learn tab, step 2: the chosen class's folders. Same list as the
// class page's Learn tab.
export default function LearnClassScreen() {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)

  if (studyClass === null) return null
  if (studyClass === undefined) return <MissingClass />

  return (
    <>
      <Header back={{ to: '/learn', label: 'Learn' }} title={studyClass.name} />
      <h2 className="section-header">Folders</h2>
      <FolderLessonList classId={classId} lessonPath={(folderId) => `/learn/${classId}/${folderId}`} />
    </>
  )
}
