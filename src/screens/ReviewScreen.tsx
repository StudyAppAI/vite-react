import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import Checklist from '../components/Checklist.tsx'
import FolderBadge from '../components/FolderBadge.tsx'
import { db, type Folder } from '../db.ts'
import { plural } from '../hooks.ts'

// Review tab: tick classes, then folders from those classes, then Start.
export default function ReviewScreen() {
  const navigate = useNavigate()
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
  const foldersOf = (classId: number) => byClass.get(classId) ?? []

  // Ticking a class also ticks all of its folders; unticking it unticks them.
  const changeClasses = (next: Set<number>) => {
    const folders = new Set(folderIds)
    for (const c of classes) {
      const was = classIds.has(c.id)
      const is = next.has(c.id)
      if (!was && is) foldersOf(c.id).forEach((f) => folders.add(f.id))
      if (was && !is) foldersOf(c.id).forEach((f) => folders.delete(f.id))
    }
    setClassIds(next)
    setFolderIds(folders)
  }

  const chosenClasses = classes.filter((c) => classIds.has(c.id))

  return (
    <>
      <Header title="Review" subtitle="Flashcards from any of your classes." />

      {classes.length === 0 ? (
        <p className="empty">Add a class first.</p>
      ) : (
        <>
          <h2 className="section-header">1. Choose classes</h2>
          <Checklist
            items={classes.map((c) => ({
              id: c.id,
              label: c.name,
              detail: plural(foldersOf(c.id).length, 'folder'),
            }))}
            selected={classIds}
            onChange={changeClasses}
            allLabel="All classes"
          />

          {chosenClasses.length > 0 && (
            <>
              <h2 className="section-header">2. Choose folders</h2>
              {chosenClasses.map((c) => (
                <div key={c.id} className="group">
                  <h3 className="group-header">{c.name}</h3>
                  {foldersOf(c.id).length === 0 ? (
                    <p className="hint-text">No folders in this class yet.</p>
                  ) : (
                    <Checklist
                      items={foldersOf(c.id).map((f) => ({
                        id: f.id,
                        label: f.name,
                        icon: <FolderBadge folder={f} />,
                      }))}
                      selected={folderIds}
                      onChange={setFolderIds}
                      allLabel={`All of ${c.name}`}
                    />
                  )}
                </div>
              ))}
            </>
          )}

          <div className="sticky-action">
            <button
              className="primary block"
              disabled={folderIds.size === 0}
              onClick={() => navigate(`/review/session?folders=${[...folderIds].join(',')}`)}
            >
              {folderIds.size === 0 ? 'Choose folders' : `Start · ${plural(folderIds.size, 'folder')}`}
            </button>
          </div>
        </>
      )}
    </>
  )
}
