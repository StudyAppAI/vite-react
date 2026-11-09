import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Folder, type StudyClass } from '../db.ts'
import { plural } from '../hooks.ts'
import FolderBadge from './FolderBadge.tsx'
import GenerateButton from './GenerateButton.tsx'
import ComingSoonButton from './ComingSoonButton.tsx'

interface Props {
  // Set on the class page's Flashcards tab: only this class, no class picker.
  // Left out on the bottom Flashcards tab: pick classes first.
  classId?: number
  sessionPath: string
}

interface Data {
  classes: StudyClass[]
  byClass: Map<number, Folder[]>
  cardCounts: Map<number, number>
}

// The one Flashcards picker: (classes →) folders with Select all and
// checkboxes, a generate button next to each folder, then Start flashcards.
export default function FlashcardPicker({ classId, sessionPath }: Props) {
  const navigate = useNavigate()
  const data = useLiveQuery(async (): Promise<Data> => {
    let classes: StudyClass[]
    if (classId === undefined) {
      classes = await db.classes.orderBy('createdAt').toArray()
    } else {
      const one = await db.classes.get(classId)
      classes = one ? [one] : []
    }
    const folders = (await db.folders.toArray()).sort((a, b) => a.order - b.order)
    const byClass = new Map<number, Folder[]>()
    for (const f of folders) byClass.set(f.classId, [...(byClass.get(f.classId) ?? []), f])
    const cardCounts = new Map<number, number>()
    await db.flashcards.each((c) => cardCounts.set(c.folderId, (cardCounts.get(c.folderId) ?? 0) + 1))
    return { classes, byClass, cardCounts }
  }, [classId])
  const [pickedClasses, setPickedClasses] = useState<Set<number>>(new Set())
  const [pickedFolders, setPickedFolders] = useState<Set<number>>(new Set())

  if (!data) return null
  const { classes, byClass, cardCounts } = data
  const foldersOf = (id: number) => byClass.get(id) ?? []

  const shownClasses = classId === undefined ? classes.filter((c) => pickedClasses.has(c.id)) : classes
  const shownFolders = shownClasses.flatMap((c) => foldersOf(c.id))
  const chosen = shownFolders.filter((f) => pickedFolders.has(f.id))
  const cardTotal = chosen.reduce((sum, f) => sum + (cardCounts.get(f.id) ?? 0), 0)

  const toggleFolder = (id: number) => {
    const next = new Set(pickedFolders)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPickedFolders(next)
  }

  const setAllFolders = (folders: Folder[], on: boolean) => {
    const next = new Set(pickedFolders)
    folders.forEach((f) => (on ? next.add(f.id) : next.delete(f.id)))
    setPickedFolders(next)
  }

  const toggleClass = (id: number) => {
    const next = new Set(pickedClasses)
    if (next.has(id)) {
      next.delete(id)
      setAllFolders(foldersOf(id), false)
    } else {
      next.add(id)
    }
    setPickedClasses(next)
  }

  const allClassesOn = classes.length > 0 && classes.every((c) => pickedClasses.has(c.id))

  if (classes.length === 0) {
    return <p className="empty">Add a class first.</p>
  }

  return (
    <>
      {classId === undefined && (
        <>
          <h2 className="section-header">1. Choose classes</h2>
          <ul className="list">
            <li>
              <button
                className="row"
                aria-pressed={allClassesOn}
                onClick={() => setPickedClasses(allClassesOn ? new Set() : new Set(classes.map((c) => c.id)))}
              >
                <span className={`check ${allClassesOn ? 'on' : ''}`} aria-hidden="true" />
                <span className="row-title strong">{allClassesOn ? 'Clear all classes' : 'Select all classes'}</span>
              </button>
            </li>
            {classes.map((c) => (
              <li key={c.id}>
                <button className="row" aria-pressed={pickedClasses.has(c.id)} onClick={() => toggleClass(c.id)}>
                  <span className={`check ${pickedClasses.has(c.id) ? 'on' : ''}`} aria-hidden="true" />
                  <span className="row-title">{c.name}</span>
                  <span className="row-detail">{plural(foldersOf(c.id).length, 'folder')}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {shownClasses.length > 0 && (
        <h2 className="section-header">{classId === undefined ? '2. Choose folders' : 'Choose folders'}</h2>
      )}
      {shownClasses.map((c) => {
        const folders = foldersOf(c.id)
        const allOn = folders.length > 0 && folders.every((f) => pickedFolders.has(f.id))
        return (
          <div key={c.id} className="group">
            {classId === undefined && <h3 className="group-header">{c.name}</h3>}
            {folders.length === 0 ? (
              <p className="hint-text">No folders yet. Add one in Course Content.</p>
            ) : (
              <ul className="list">
                <li>
                  <button className="row" aria-pressed={allOn} onClick={() => setAllFolders(folders, !allOn)}>
                    <span className={`check ${allOn ? 'on' : ''}`} aria-hidden="true" />
                    <span className="row-title strong">{allOn ? 'Clear all' : 'Select all'}</span>
                  </button>
                </li>
                {folders.map((f) => {
                  const on = pickedFolders.has(f.id)
                  const count = cardCounts.get(f.id) ?? 0
                  return (
                    <li key={f.id} className="folder-pick">
                      <button className="row" aria-pressed={on} onClick={() => toggleFolder(f.id)}>
                        <span className={`check ${on ? 'on' : ''}`} aria-hidden="true" />
                        <FolderBadge folder={f} />
                        <span className="row-title">{f.name}</span>
                        <span className="row-detail">{count === 0 ? 'No cards' : plural(count, 'card')}</span>
                      </button>
                      <div className="row-action">
                        <GenerateButton folderId={f.id} kind="flashcards" small />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}

      <div className="sticky-action">
        <button
          className="primary block"
          disabled={cardTotal === 0}
          onClick={() => navigate(`${sessionPath}?folders=${chosen.map((f) => f.id).join(',')}`)}
        >
          {cardTotal === 0 ? 'Start flashcards' : `Start flashcards · ${plural(cardTotal, 'card')}`}
        </button>
        {chosen.length > 0 && cardTotal === 0 && (
          <p className="generate-note center">The chosen folders have no flashcards yet.</p>
        )}
      </div>
      <ComingSoonButton label="Take a test" className="block spaced" />
    </>
  )
}
