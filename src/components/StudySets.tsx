import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import EditableName from './EditableName.tsx'
import SetEditorSheet from './SetEditorSheet.tsx'
import { TrashIcon } from './icons.tsx'
import { db, deleteStudySet, getStudySets, updateStudySet, type StudySet } from '../db.ts'
import { plural } from '../hooks.ts'

// "My sets" on the Flashcards tab: flashcard sets the user made from any
// folders, e.g. Midterm, Final, Week 2.
export default function StudySets() {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const sets = await getStudySets()
    const folders = new Map((await db.folders.toArray()).map((f) => [f.id, f]))
    const cardCounts = new Map<number, number>()
    await db.flashcards.each((c) => cardCounts.set(c.folderId, (cardCounts.get(c.folderId) ?? 0) + 1))
    return { sets, folders, cardCounts }
  })
  const [editing, setEditing] = useState<StudySet | 'new' | null>(null)

  if (!data) return null
  const { sets, folders, cardCounts } = data

  const remove = async (set: StudySet) => {
    if (window.confirm(`Delete the set “${set.name}”?\n\nThis can’t be undone. Your folders and flashcards are not deleted.`)) {
      await deleteStudySet(set.id)
    }
  }

  return (
    <>
      <h2 className="section-header">My sets</h2>
      {sets.length === 0 ? (
        <p className="hint-text">
          Make a set from any folders, for example every Week 2 folder, everything for a midterm, or a whole class.
        </p>
      ) : (
        <ul className="list">
          {sets.map((set) => {
            const ids = set.folderIds.filter((id) => folders.has(id))
            const cards = ids.reduce((sum, id) => sum + (cardCounts.get(id) ?? 0), 0)
            const names = ids.map((id) => folders.get(id)!.name)
            return (
              <li key={set.id} className="set-card">
                <div className="folder-card-top">
                  <EditableName
                    value={set.name}
                    what="set"
                    className="folder-name"
                    onSave={(name) => updateStudySet(set.id, { name })}
                  />
                  <button
                    className="icon-button trash"
                    aria-label={`Delete set ${set.name}`}
                    title="Delete set"
                    onClick={() => remove(set)}
                  >
                    <TrashIcon />
                  </button>
                </div>
                <p className="set-detail">
                  {plural(ids.length, 'folder')} · {plural(cards, 'card')}
                  {names.length > 0 && <span className="set-folders"> · {names.join(', ')}</span>}
                </p>
                <div className="set-actions">
                  <button
                    className="primary small-button"
                    disabled={cards === 0}
                    onClick={() => navigate(`/flashcards/session?folders=${ids.join(',')}`)}
                  >
                    Study set
                  </button>
                  <button className="secondary small-button" onClick={() => setEditing(set)}>
                    Edit folders
                  </button>
                </div>
                {cards === 0 && <p className="generate-note">No flashcards in this set’s folders yet.</p>}
              </li>
            )
          })}
        </ul>
      )}
      <button className="secondary block spaced" onClick={() => setEditing('new')}>
        + New set
      </button>

      {editing && <SetEditorSheet set={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
