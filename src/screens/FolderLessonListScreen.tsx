import { Link } from 'react-router-dom'
import Header from '../components/Header.tsx'
import FolderBadge from '../components/FolderBadge.tsx'
import { useClass, useFolders, useIdParam, useLessonFolderIds } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'

interface Props {
  // "class": /classes/:classId/learn   "learn": /learn/:classId
  from: 'class' | 'learn'
}

// Pick one folder from a class to open its lesson.
export default function FolderLessonListScreen({ from }: Props) {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)
  const folders = useFolders(classId)
  const lessonFolderIds = useLessonFolderIds()

  if (studyClass === null || folders === undefined) return null
  if (studyClass === undefined) return <MissingClass />

  const base = from === 'class' ? `/classes/${classId}/learn` : `/learn/${classId}`
  const back =
    from === 'class'
      ? { to: `/classes/${classId}`, label: studyClass.name }
      : { to: '/learn', label: 'Learn' }

  return (
    <>
      <Header back={back} title={from === 'class' ? 'Learn' : studyClass.name} />
      {folders.length === 0 ? (
        <p className="empty">This class has no folders yet. Add one in Course Content.</p>
      ) : (
        <>
          <h2 className="section-header">Choose a folder</h2>
          <ul className="list">
            {folders.map((f) => (
              <li key={f.id}>
                <Link className="row" to={`${base}/${f.id}`}>
                  <FolderBadge folder={f} />
                  <span className="row-title">{f.name}</span>
                  <span className="row-detail">
                    {lessonFolderIds.has(f.id) ? 'Lesson ready' : 'No lesson'}
                  </span>
                  <span className="chevron" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
