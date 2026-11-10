import { Link } from 'react-router-dom'
import Header from '../components/Header.tsx'
import LearnTopicButton from '../components/LearnTopicButton.tsx'
import { useClassesInOrder } from '../hooks.ts'

// Learn tab, step 1: pick a class.
export default function LearnScreen() {
  const classes = useClassesInOrder()

  return (
    <>
      <Header title="Learn" subtitle="Interactive lessons for each week or topic." />
      <div className="button-row">
        <Link className="secondary" to="/mindmap">
          Open mind map
        </Link>
        <LearnTopicButton className="secondary" />
      </div>
      {classes === undefined ? null : classes.length === 0 ? (
        <p className="empty">Add a class first, or learn a new topic.</p>
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
