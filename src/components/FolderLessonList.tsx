import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.ts'
import { folderTypeLabel, useFolders } from '../hooks.ts'
import FolderBadge from './FolderBadge.tsx'
import GenerateButton from './GenerateButton.tsx'

interface Props {
  classId: number
  lessonPath: (folderId: number) => string
}

// The one Learn folder list, used by the class page's Learn tab and the
// bottom Learn tab: each folder with Open lesson and its lesson button.
export default function FolderLessonList({ classId, lessonPath }: Props) {
  const folders = useFolders(classId)
  const withLesson = useLiveQuery(
    async () => new Set((await db.lessons.where('classId').equals(classId).toArray()).map((l) => l.folderId)),
    [classId],
  )

  if (folders === undefined || withLesson === undefined) return null
  if (folders.length === 0) {
    return <p className="empty">This class has no folders yet. Add one in Course Content.</p>
  }

  return (
    <ul className="list">
      {folders.map((f) => {
        const has = withLesson.has(f.id)
        return (
          <li key={f.id} className="lesson-item">
            <div className="row">
              <FolderBadge folder={f} />
              <span className="row-text">
                <span className="row-title">{f.name}</span>
                <span className="row-detail">
                  {folderTypeLabel(f)} · {has ? 'Lesson ready' : 'No lesson yet'}
                </span>
              </span>
            </div>
            <div className="row-action two">
              {has && (
                <Link className="primary small-button" to={lessonPath(f.id)}>
                  Open lesson
                </Link>
              )}
              <GenerateButton folderId={f.id} kind="lesson" small />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
