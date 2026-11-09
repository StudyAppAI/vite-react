import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.tsx'
import FolderChecklist from '../components/FolderChecklist.tsx'
import { plural, useCardCounts, useClass, useFolders, useIdParam } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'

// Review inside one class: pick folders from this class, then start.
export default function ClassReviewScreen() {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)
  const folders = useFolders(classId)
  const cardCounts = useCardCounts()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (studyClass === null || folders === undefined) return null
  if (studyClass === undefined) return <MissingClass />

  const total = [...selected].reduce((sum, id) => sum + (cardCounts.get(id) ?? 0), 0)

  return (
    <>
      <Header back={{ to: `/classes/${classId}`, label: studyClass.name }} title="Review" />
      {folders.length === 0 ? (
        <p className="empty">This class has no folders yet. Add one in Course Content.</p>
      ) : (
        <>
          <h2 className="section-header">Choose folders</h2>
          <FolderChecklist
            folders={folders}
            cardCounts={cardCounts}
            selected={selected}
            onChange={setSelected}
          />
          <div className="sticky-action">
            <button
              className="primary block"
              disabled={total === 0}
              onClick={() =>
                navigate(`/classes/${classId}/review/session?folders=${[...selected].join(',')}`)
              }
            >
              {total === 0 ? 'Choose folders' : `Start · ${plural(total, 'card')}`}
            </button>
          </div>
        </>
      )}
    </>
  )
}
