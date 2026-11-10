import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.ts'
import { folderTypeLabel, useFolders } from '../hooks.ts'
import FolderBadge from './FolderBadge.tsx'
import GenerateButton from './GenerateButton.tsx'
import BulkGenerateButton from './BulkGenerateButton.tsx'
import LearnTopicButton from './LearnTopicButton.tsx'

interface Props {
  classId: number
  lessonPath: (folderId: number) => string
}

// The one Learn folder list, used by the class page's Learn tab and the
// bottom Learn tab: each folder with Open lesson and its lesson button.
export default function FolderLessonList({ classId, lessonPath }: Props) {
  const folders = useFolders(classId)
  const info = useLiveQuery(
    async () => {
      const withLesson = new Set((await db.lessons.where('classId').equals(classId).toArray()).map((l) => l.folderId))
      const withText = new Set<number>()
      await db.files.where('classId').equals(classId).each((f) => {
        if (f.folderId !== null && f.extractedText) withText.add(f.folderId)
      })
      return { withLesson, withText }
    },
    [classId],
  )

  if (folders === undefined || info === undefined) return null
  const { withLesson, withText } = info
  if (folders.length === 0) {
    return (
      <div className="bulk-box">
        <p className="notice-text">This class has no folders yet. Add one in Course Content, or learn a new topic instead.</p>
        <LearnTopicButton />
      </div>
    )
  }

  const needLesson = folders.filter((f) => withText.has(f.id) && !withLesson.has(f.id))

  return (
    <>
      <div className="bulk-box">
        {withText.size === 0 ? (
          <>
            <p className="notice-text">
              There’s no content in this class to generate lessons from. Add files or text in Course Content, or
              learn a new topic instead.
            </p>
            <LearnTopicButton />
          </>
        ) : (
          <BulkGenerateButton
            kind="lesson"
            folderIds={needLesson.map((f) => f.id)}
            allDoneText="Every folder with content has a lesson."
          />
        )}
      </div>
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
                    {folderTypeLabel(f)} ·{' '}
                    {has ? 'Lesson ready' : withText.has(f.id) ? 'No lesson yet' : 'No content yet'}
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
    </>
  )
}
