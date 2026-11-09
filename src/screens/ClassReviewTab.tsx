import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Checklist from '../components/Checklist.tsx'
import FolderBadge from '../components/FolderBadge.tsx'
import { plural, useFolders } from '../hooks.ts'
import { useClassContext } from './classContext.ts'

// Class page → Review tab: tick folders from this class, then Start.
export default function ClassReviewTab() {
  const { studyClass } = useClassContext()
  const folders = useFolders(studyClass.id)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  if (folders === undefined) return null
  if (folders.length === 0) {
    return <p className="empty">This class has no folders yet. Add one in Course Content.</p>
  }

  return (
    <>
      <h2 className="section-header">Choose folders</h2>
      <Checklist
        items={folders.map((f) => ({ id: f.id, label: f.name, icon: <FolderBadge folder={f} /> }))}
        selected={selected}
        onChange={setSelected}
        allLabel="All folders"
      />
      <div className="sticky-action">
        <button
          className="primary block"
          disabled={selected.size === 0}
          onClick={() =>
            navigate(`/classes/${studyClass.id}/review/session?folders=${[...selected].join(',')}`)
          }
        >
          {selected.size === 0 ? 'Choose folders' : `Start · ${plural(selected.size, 'folder')}`}
        </button>
      </div>
    </>
  )
}
