import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import { db } from '../db.ts'

// Learn tab, step 1: pick a class.
export default function LearnScreen() {
  const classes = useLiveQuery(() => db.classes.orderBy('createdAt').toArray())

  return (
    <>
      <Header title="Learn" subtitle="Lessons for each week or topic." />
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
