import Header from '../components/Header.tsx'
import FolderLinkList from '../components/FolderLinkList.tsx'
import { useClass, useFolders, useIdParam } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'

// Learn tab, step 2: pick a folder from the chosen class.
export default function LearnClassScreen() {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)
  const folders = useFolders(classId)

  if (studyClass === null || folders === undefined) return null
  if (studyClass === undefined) return <MissingClass />

  return (
    <>
      <Header back={{ to: '/learn', label: 'Learn' }} title={studyClass.name} />
      {folders.length === 0 ? (
        <p className="empty">This class has no folders yet.</p>
      ) : (
        <>
          <h2 className="section-header">Choose a folder</h2>
          <FolderLinkList folders={folders} linkTo={(f) => `/learn/${classId}/${f.id}`} />
        </>
      )}
    </>
  )
}
