import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import { db } from '../db.ts'
import { plural } from '../hooks.ts'

export default function HomeScreen() {
  const counts = useLiveQuery(async () => ({
    classes: await db.classes.count(),
    cards: await db.flashcards.count(),
    lessons: await db.lessons.count(),
  }))

  return (
    <>
      <Header title="Study App" subtitle="Your classes, flashcards and lessons, on this device." />
      <ul className="list">
        <li>
          <Link className="row" to="/classes">
            <span className="row-title">Classes</span>
            <span className="row-detail">{counts ? plural(counts.classes, 'class', 'classes') : ''}</span>
            <span className="chevron" aria-hidden="true">›</span>
          </Link>
        </li>
        <li>
          <Link className="row" to="/review">
            <span className="row-title">Review flashcards</span>
            <span className="row-detail">{counts ? plural(counts.cards, 'card') : ''}</span>
            <span className="chevron" aria-hidden="true">›</span>
          </Link>
        </li>
        <li>
          <Link className="row" to="/learn">
            <span className="row-title">Learn</span>
            <span className="row-detail">{counts ? plural(counts.lessons, 'lesson') : ''}</span>
            <span className="chevron" aria-hidden="true">›</span>
          </Link>
        </li>
      </ul>
    </>
  )
}
