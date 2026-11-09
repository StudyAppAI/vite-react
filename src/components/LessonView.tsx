import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.ts'
import ComingSoonButton from './ComingSoonButton.tsx'

// The one lesson screen body, used at /classes/:classId/learn/:folderId and
// /learn/:classId/:folderId. Reads the folder's single lesson.
export default function LessonView({ folderId }: { folderId: number }) {
  const lesson = useLiveQuery(() => db.lessons.where('folderId').equals(folderId).first(), [folderId], null)

  if (lesson === null) return null
  if (lesson === undefined) {
    return (
      <div className="empty-state">
        <p className="empty-title">No lesson yet</p>
        <p className="row-detail">Use “Generate interactive lesson” on the Learn list to make one.</p>
      </div>
    )
  }

  return (
    <article className="lesson">
      <h2 className="lesson-title">{lesson.content.title}</h2>
      {lesson.content.sections.map((section, i) => (
        <section key={i} className="lesson-section">
          <h3>{section.heading}</h3>
          {section.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          <div className="section-tools">
            <ComingSoonButton label="Show visual" />
            <ComingSoonButton label="Step through it" />
            <ComingSoonButton label="Take section quiz" />
          </div>
        </section>
      ))}
    </article>
  )
}
