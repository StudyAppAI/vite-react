import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Sheet from './Sheet.tsx'
import FolderBadge from './FolderBadge.tsx'
import { addStudySet, db, getClassesInOrder, updateStudySet, type Folder, type StudySet } from '../db.ts'
import { plural } from '../hooks.ts'

interface Props {
  set?: StudySet // editing an existing set; left out when making a new one
  onClose: () => void
}

const NAME_SUGGESTIONS = ['Midterm', 'Final', 'This week']

// Make or edit a flashcard set: a name and any folders from any classes.
export default function SetEditorSheet({ set, onClose }: Props) {
  const data = useLiveQuery(async () => {
    const classes = await getClassesInOrder()
    const folders = (await db.folders.toArray()).sort((a, b) => a.order - b.order)
    const cardCounts = new Map<number, number>()
    await db.flashcards.each((c) => cardCounts.set(c.folderId, (cardCounts.get(c.folderId) ?? 0) + 1))
    return { classes, folders, cardCounts }
  })
  const [name, setName] = useState(set?.name ?? '')
  const [picked, setPicked] = useState<Set<number>>(new Set(set?.folderIds ?? []))

  if (!data) return null
  const { classes, folders, cardCounts } = data
  const foldersOf = (classId: number) => folders.filter((f) => f.classId === classId)

  // Folder names used in two or more classes, e.g. "Week 2" → every Week 2 folder.
  const byName = new Map<string, Folder[]>()
  for (const f of folders) {
    const key = f.name.trim().toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), f])
  }
  const shared = [...byName.values()].filter((list) => new Set(list.map((f) => f.classId)).size > 1)

  const allOn = (list: Folder[]) => list.length > 0 && list.every((f) => picked.has(f.id))
  const toggleMany = (list: Folder[]) => {
    const next = new Set(picked)
    const on = allOn(list)
    list.forEach((f) => (on ? next.delete(f.id) : next.add(f.id)))
    setPicked(next)
  }
  const toggle = (id: number) => {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  const chosenIds = folders.filter((f) => picked.has(f.id)).map((f) => f.id)
  const cards = chosenIds.reduce((sum, id) => sum + (cardCounts.get(id) ?? 0), 0)

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed || chosenIds.length === 0) return
    if (set) await updateStudySet(set.id, { name: trimmed, folderIds: chosenIds })
    else await addStudySet(trimmed, chosenIds)
    onClose()
  }

  return (
    <Sheet title={set ? `Edit “${set.name}”` : 'New flashcard set'} onClose={onClose}>
      <div className="sheet-body sheet-scroll">
        <label className="field-label" htmlFor="set-name">
          Set name
        </label>
        <input
          id="set-name"
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Midterm, Week 2, Biology"
          autoComplete="off"
        />
        <div className="suggestions">
          <span className="suggestions-label">Suggestions:</span>
          {NAME_SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setName(s)}>
              {s}
            </button>
          ))}
        </div>

        {folders.length === 0 ? (
          <p className="notice-text">You don’t have any folders yet. Add folders to your classes first.</p>
        ) : (
          <>
            <p className="field-label">Quick picks</p>
            <div className="suggestions">
              {shared.map((list) => (
                <button
                  key={list[0].name}
                  type="button"
                  className={`chip ${allOn(list) ? 'on' : ''}`}
                  aria-pressed={allOn(list)}
                  onClick={() => toggleMany(list)}
                >
                  Every “{list[0].name}” folder ({list.length})
                </button>
              ))}
              {classes
                .filter((c) => foldersOf(c.id).length > 0)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip ${allOn(foldersOf(c.id)) ? 'on' : ''}`}
                    aria-pressed={allOn(foldersOf(c.id))}
                    onClick={() => toggleMany(foldersOf(c.id))}
                  >
                    All of {c.name}
                  </button>
                ))}
            </div>

            <p className="field-label">Folders</p>
            {classes
              .filter((c) => foldersOf(c.id).length > 0)
              .map((c) => (
                <div key={c.id} className="group">
                  <h3 className="group-header">{c.name}</h3>
                  <ul className="list">
                    {foldersOf(c.id).map((f) => {
                      const on = picked.has(f.id)
                      const count = cardCounts.get(f.id) ?? 0
                      return (
                        <li key={f.id}>
                          <button className="row" aria-pressed={on} onClick={() => toggle(f.id)}>
                            <span className={`check ${on ? 'on' : ''}`} aria-hidden="true" />
                            <FolderBadge folder={f} />
                            <span className="row-title">{f.name}</span>
                            <span className="row-detail">{count === 0 ? 'No cards' : plural(count, 'card')}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
          </>
        )}

        <button className="primary block" disabled={!name.trim() || chosenIds.length === 0} onClick={save}>
          {set ? 'Save set' : 'Create set'}
          {chosenIds.length > 0 ? ` · ${plural(chosenIds.length, 'folder')}, ${plural(cards, 'card')}` : ''}
        </button>
      </div>
    </Sheet>
  )
}
