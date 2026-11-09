import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.ts'

interface Props {
  folderId: number
  classId: number
}

// The one lesson screen. Both /classes/:classId/learn/:folderId and
// /learn/:classId/:folderId show this, reading the folder's single lesson.
export default function LessonView({ folderId, classId }: Props) {
  const lesson = useLiveQuery(
    () => db.lessons.where('folderId').equals(folderId).first(),
    [folderId],
    null,
  )

  if (lesson === null) return null

  if (lesson === undefined) {
    return (
      <div className="empty-state">
        <p>This folder doesn’t have a lesson yet.</p>
        <Link className="primary block link-button" to={`/classes/${classId}/content/${folderId}`}>
          Go to folder to generate one
        </Link>
      </div>
    )
  }

  return (
    <div className="lesson">
      <h2 className="lesson-title">{lesson.content.title}</h2>
      <div className="placeholder-card">
        <p className="placeholder-label">Visual lesson</p>
        <p>
          The full lesson screen, with sections, visuals and quizzes, is coming in a later step.
        </p>
        <p className="row-detail">
          {lesson.content.sections.length}{' '}
          {lesson.content.sections.length === 1 ? 'section' : 'sections'} ready · made{' '}
          {new Date(lesson.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
