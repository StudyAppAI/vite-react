import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.ts'

// The one lesson screen body. Both /classes/:classId/learn/:folderId and
// /learn/:classId/:folderId show this, reading the folder's single lesson.
export default function LessonView({ folderId }: { folderId: number }) {
  const lesson = useLiveQuery(
    () => db.lessons.where('folderId').equals(folderId).first(),
    [folderId],
    null,
  )

  if (lesson === null) return null

  if (lesson === undefined) {
    return (
      <div className="empty-state">
        <p className="empty-title">No lesson yet</p>
        <p className="row-detail">Lessons for this folder will appear here.</p>
      </div>
    )
  }

  return <h2 className="lesson-title">{lesson.content.title}</h2>
}
