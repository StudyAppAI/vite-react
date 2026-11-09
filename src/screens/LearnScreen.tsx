import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import { db } from '../db.ts'
import { plural } from '../hooks.ts'

// Top-level Learn: pick a class first.
export default function LearnScreen() {
  const classes = useLiveQuery(() => db.classes.orderBy('createdAt').toArray())
  const lessonCounts = useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.lessons.each((l) => counts.set(l.classId, (counts.get(l.classId) ?? 0) + 1))
    return counts
  })

  return (
    <>
      <Header title="Learn" subtitle="Visual lessons for each week or topic." />
      {classes === undefined ? null : classes.length === 0 ? (
        <p className="empty">Add a class first.</p>
      ) : (
        <>
          <h2 className="section-header">Choose a class</h2>
          <ul className="list">
            {classes.map((c) => (
              <li key={c.id}>
                <Link className="row" to={`/learn/${c.id}`}>
                  <span className="row-title">{c.name}</span>
                  <span className="row-detail">{plural(lessonCounts?.get(c.id) ?? 0, 'lesson')}</span>
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
