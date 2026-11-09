import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import FolderChecklist from '../components/FolderChecklist.tsx'
import { db, type Folder } from '../db.ts'
import { plural, useCardCounts } from '../hooks.ts'

// Top-level Review: pick classes, then folders from those classes, then start.
export default function ReviewScreen() {
  const navigate = useNavigate()
  const cardCounts = useCardCounts()
  const data = useLiveQuery(async () => {
    const classes = await db.classes.orderBy('createdAt').toArray()
    const folders = (await db.folders.toArray()).sort((a, b) => a.order - b.order)
    const byClass = new Map<number, Folder[]>()
    for (const f of folders) byClass.set(f.classId, [...(byClass.get(f.classId) ?? []), f])
    return { classes, byClass }
  })
  const [classIds, setClassIds] = useState<Set<number>>(new Set())
  const [folderIds, setFolderIds] = useState<Set<number>>(new Set())

  if (!data) return null
  const { classes, byClass } = data

  const withCards = (classId: number) =>
    (byClass.get(classId) ?? []).filter((f) => (cardCounts.get(f.id) ?? 0) > 0).map((f) => f.id)

  // Choosing a class also chooses its folders; un-choosing removes them.
  const setClasses = (next: Set<number>) => {
    const folders = new Set(folderIds)
    for (const c of classes) {
      const was = classIds.has(c.id)
      const is = next.has(c.id)
      if (!was && is) withCards(c.id).forEach((id) => folders.add(id))
      if (was && !is) (byClass.get(c.id) ?? []).forEach((f) => folders.delete(f.id))
    }
    setClassIds(next)
    setFolderIds(folders)
  }

  const classCards = (classId: number) =>
    withCards(classId).reduce((sum, id) => sum + (cardCounts.get(id) ?? 0), 0)
  const pickableClasses = classes.filter((c) => classCards(c.id) > 0)
  const allClasses = pickableClasses.length > 0 && pickableClasses.every((c) => classIds.has(c.id))

  const toggleClass = (id: number) => {
    const next = new Set(classIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setClasses(next)
  }

  const toggleAllClasses = () =>
    setClasses(allClasses ? new Set() : new Set(pickableClasses.map((c) => c.id)))

  const chosenClasses = classes.filter((c) => classIds.has(c.id))
  const total = [...folderIds].reduce((sum, id) => sum + (cardCounts.get(id) ?? 0), 0)

  return (
    <>
      <Header title="Review" subtitle="Flashcards from any of your classes." />

      {classes.length === 0 ? (
        <p className="empty">Add a class and make some flashcards first.</p>
      ) : (
        <>
          <h2 className="section-header">1. Choose classes</h2>
          <ul className="list">
            <li>
              <button
                className="row"
                onClick={toggleAllClasses}
                disabled={pickableClasses.length === 0}
                aria-pressed={allClasses}
              >
                <span className={`check ${allClasses ? 'on' : ''}`} aria-hidden="true" />
                <span className="row-title strong">All classes</span>
              </button>
            </li>
            {classes.map((c) => {
              const count = classCards(c.id)
              const on = classIds.has(c.id)
              return (
                <li key={c.id}>
                  <button
                    className="row"
                    onClick={() => toggleClass(c.id)}
                    disabled={count === 0}
                    aria-pressed={on}
                  >
                    <span className={`check ${on ? 'on' : ''}`} aria-hidden="true" />
                    <span className="row-title">{c.name}</span>
                    <span className="row-detail">
                      {count === 0 ? 'No cards' : plural(count, 'card')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {chosenClasses.length > 0 && (
            <>
              <h2 className="section-header">2. Choose folders</h2>
              {chosenClasses.map((c) => (
                <div key={c.id} className="group">
                  <h3 className="group-header">{c.name}</h3>
                  <FolderChecklist
                    folders={byClass.get(c.id) ?? []}
                    cardCounts={cardCounts}
                    selected={folderIds}
                    onChange={setFolderIds}
                    allLabel={`All of ${c.name}`}
                  />
                </div>
              ))}
            </>
          )}

          <div className="sticky-action">
            <button
              className="primary block"
              disabled={total === 0}
              onClick={() => navigate(`/review/session?folders=${[...folderIds].join(',')}`)}
            >
              {total === 0 ? 'Choose what to review' : `Start · ${plural(total, 'card')}`}
            </button>
          </div>
        </>
      )}
    </>
  )
}
