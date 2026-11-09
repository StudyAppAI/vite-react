import FolderLessonList from '../components/FolderLessonList.tsx'
import { useClassContext } from './classContext.ts'

// Class page → Learn tab. Same folder list as the bottom Learn tab.
export default function ClassLearnTab() {
  const { studyClass } = useClassContext()
  return (
    <>
      <h2 className="section-header">Folders</h2>
      <FolderLessonList
        classId={studyClass.id}
        lessonPath={(folderId) => `/classes/${studyClass.id}/learn/${folderId}`}
      />
    </>
  )
}
