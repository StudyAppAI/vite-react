import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Sheet from './Sheet.tsx'
import NameSheet from './NameSheet.tsx'
import {
  addLabel,
  deleteLabel,
  getLabelsInOrder,
  moveLabel,
  renameLabel,
  type ClassLabel,
} from '../db.ts'

const LABEL_SUGGESTIONS = ['Upcoming Courses', 'Current Courses', 'Completed Courses']

// Add, rename, reorder and delete labels.
export function ManageLabelsSheet({ onClose }: { onClose: () => void }) {
  const labels = useLiveQuery(getLabelsInOrder)
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<ClassLabel | null>(null)

  if (adding) {
    return (
      <NameSheet
        title="New label"
        label="Label name"
        placeholder="e.g. Current Courses"
        suggestions={LABEL_SUGGESTIONS.filter((s) => !labels?.some((l) => l.name === s))}
        submitLabel="Create label"
        onSubmit={async (name) => {
          await addLabel(name)
        }}
        onClose={() => setAdding(false)}
      />
    )
  }
  if (renaming) {
    return (
      <NameSheet
        title="Rename label"
        label="Label name"
        initial={renaming.name}
        submitLabel="Save label name"
        onSubmit={(name) => renameLabel(renaming.id, name)}
        onClose={() => setRenaming(null)}
      />
    )
  }

  const remove = async (l: ClassLabel) => {
    if (window.confirm(`Delete the label “${l.name}”? Its classes stay, without a label.`)) {
      await deleteLabel(l.id)
    }
  }

  return (
    <Sheet title="Labels" onClose={onClose}>
      <div className="sheet-body sheet-scroll">
        {labels && labels.length === 0 && (
          <p className="hint-text">
            Labels group your classes, for example Current Courses. To put a class under a label, press and
            hold it on the Classes page and drag it into the label’s section.
          </p>
        )}
        {labels && labels.length > 0 && (
          <ul className="list">
            {labels.map((l, i) => (
              <li key={l.id} className="managed-item">
                <div className="row">
                  <span className="row-title strong">{l.name}</span>
                </div>
                <div className="item-actions">
                  <button onClick={() => moveLabel(l.id, -1)} disabled={i === 0}>
                    Move up
                  </button>
                  <button onClick={() => moveLabel(l.id, 1)} disabled={i === labels.length - 1}>
                    Move down
                  </button>
                  <button onClick={() => setRenaming(l)}>Rename label</button>
                  <button className="danger-text" onClick={() => remove(l)}>
                    Delete label
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button className="primary block" onClick={() => setAdding(true)}>
          + Create new label
        </button>
      </div>
    </Sheet>
  )
}
