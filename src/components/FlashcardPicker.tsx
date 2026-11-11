import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addStudySet, db, getClassesInOrder, type Folder, type StudyClass } from '../db.ts'
import { plural } from '../hooks.ts'
import FolderBadge from './FolderBadge.tsx'
import GenerateButton from './GenerateButton.tsx'
import ComingSoonButton from './ComingSoonButton.tsx'
import BulkGenerateButton from './BulkGenerateButton.tsx'
import LearnTopicButton from './LearnTopicButton.tsx'
import NameSheet from './NameSheet.tsx'
import { showToast } from '../toast.ts'

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
  withText: Set<number> // folders that have content with readable text
}

// The one Flashcards picker: (classes →) folders with Select all and
// checkboxes, a generate button next to each folder, then Start flashcards.
export default function FlashcardPicker({ classId, sessionPath }: Props) {
  const navigate = useNavigate()
  const data = useLiveQuery(async (): Promise<Data> => {
    let classes: StudyClass[]
    if (classId === undefined) {
      classes = await getClassesInOrder()
    } else {
      const one = await db.classes.get(classId)
      classes = one ? [one] : []
    }
    const folders = (await db.folders.toArray()).sort((a, b) => a.order - b.order)
    const byClass = new Map<number, Folder[]>()
    for (const f of folders) byClass.set(f.classId, [...(byClass.get(f.classId) ?? []), f])
    const cardCounts = new Map<number, number>()
    await db.flashcards.each((c) => cardCounts.set(c.folderId, (cardCounts.get(c.folderId) ?? 0) + 1))
    const withText = new Set<number>()
    await db.files.each((f) => {
      if (f.folderId !== null && f.extractedText) withText.add(f.folderId)
    })
    return { classes, byClass, cardCounts, withText }
  }, [classId])
  const [pickedClasses, setPickedClasses] = useState<Set<number>>(new Set())
  const [pickedFolders, setPickedFolders] = useState<Set<number>>(new Set())
  const [savingSet, setSavingSet] = useState(false)

  if (!data) return null
  const { classes, byClass, cardCounts, withText } = data
  const foldersOf = (id: number) => byClass.get(id) ?? []

  const shownClasses = classId === undefined ? classes.filter((c) => pickedClasses.has(c.id)) : classes
  const shownFolders = shownClasses.flatMap((c) => foldersOf(c.id))
  const chosen = shownFolders.filter((f) => pickedFolders.has(f.id))
  const cardTotal = chosen.reduce((sum, f) => sum + (cardCounts.get(f.id) ?? 0), 0)

  // "Generate flashcards for N folders": the ticked folders, or every folder
  // in the chosen classes when none are ticked. Only folders with content
  // and no cards yet.
  const scope = chosen.length > 0 ? chosen : shownFolders
  const scopeWithText = scope.filter((f) => withText.has(f.id))
  const needCards = scopeWithText.filter((f) => (cardCounts.get(f.id) ?? 0) === 0)
  const empty = scope.filter((f) => !withText.has(f.id))
  const classOf = new Map(classes.map((c) => [c.id, c.name]))

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

      {scope.length > 0 && (
        <div className="bulk-box">
          {scopeWithText.length === 0 ? (
            <p className="notice-text">
              There’s no content in {chosen.length > 0 ? 'the selected folders' : 'these folders'} to generate
              flashcards from. Tap a folder below to add files or text, or learn a new topic instead.
            </p>
          ) : (
            <BulkGenerateButton
              kind="flashcards"
              folderIds={needCards.map((f) => f.id)}
              allDoneText={`Every ${chosen.length > 0 ? 'selected ' : ''}folder with content has flashcards.`}
            />
          )}
          {empty.length > 0 && (
            <div className="empty-folders">
              <p className="field-label">Folders with no content yet</p>
              {empty.map((f) => (
                <Link key={f.id} className="folder-link" to={`/classes/${f.classId}/content/${f.id}`}>
                  <span>
                    Add content to {f.name}
                    {classId === undefined && <span className="row-detail"> · {classOf.get(f.classId)}</span>}
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          )}
          {scopeWithText.length === 0 && <LearnTopicButton />}
        </div>
      )}

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
      {chosen.length > 0 && (
        <button className="secondary block spaced" onClick={() => setSavingSet(true)}>
          Save selection as a set
        </button>
      )}
      <ComingSoonButton label="Take a test" className="block spaced" />

      {savingSet && (
        <NameSheet
          title="New flashcard set"
          label="Set name"
          placeholder="e.g. Midterm"
          suggestions={['Midterm', 'Final', 'This week']}
          submitLabel={`Save set of ${plural(chosen.length, 'folder')}`}
          onSubmit={async (name) => {
            await addStudySet(name, chosen.map((f) => f.id))
            showToast(`Saved “${name}” to My sets`)
          }}
          onClose={() => setSavingSet(false)}
        />
      )}
    </>
  )
}
