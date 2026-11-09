import FolderLinkList from '../components/FolderLinkList.tsx'
import { useFolders } from '../hooks.ts'
import { useClassContext } from './classContext.ts'

// Class page → Learn tab: this class's folders; each opens its lesson.
export default function ClassLearnTab() {
  const { studyClass } = useClassContext()
  const folders = useFolders(studyClass.id)

  if (folders === undefined) return null
  if (folders.length === 0) {
    return <p className="empty">This class has no folders yet. Add one in Course Content.</p>
  }

  return (
    <>
      <h2 className="section-header">Choose a folder</h2>
      <FolderLinkList folders={folders} linkTo={(f) => `/classes/${studyClass.id}/learn/${f.id}`} />
    </>
  )
}
