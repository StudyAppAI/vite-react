import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import FilePicker from '../components/FilePicker.tsx'
import PasteTextSheet from '../components/PasteTextSheet.tsx'
import ContentItemRow from '../components/ContentItemRow.tsx'
import GenerateButton from '../components/GenerateButton.tsx'
import { addFilesToFolder, addTextToFolder, db, deleteFile, type StoredFile } from '../db.ts'
import { readPendingFiles } from '../extract.ts'
import { folderTypeLabel, plural, useIdParam } from '../hooks.ts'

// A folder inside Course Content: its content items, ways to add content,
// and the two generate buttons.
export default function FolderScreen() {
  const classId = useIdParam('classId')
  const folderId = useIdParam('folderId')
  const folder = useLiveQuery(() => db.folders.get(folderId), [folderId], null)
  const items = useLiveQuery(() => db.files.where('folderId').equals(folderId).sortBy('createdAt'), [folderId])
  const cardCount = useLiveQuery(() => db.flashcards.where('folderId').equals(folderId).count(), [folderId], 0)
  const hasLesson = useLiveQuery(
    async () => (await db.lessons.where('folderId').equals(folderId).count()) > 0,
    [folderId],
    false,
  )
  const [pasting, setPasting] = useState(false)

  const back = { to: `/classes/${classId}/content`, label: 'Course Content' }

  if (folder === null) return null
  if (folder === undefined || folder.classId !== classId) {
    return (
      <>
        <Header back={back} title="Not found" />
        <p className="empty">This folder no longer exists.</p>
      </>
    )
  }

  const upload = async (files: File[]) => {
    await addFilesToFolder(classId, folderId, files)
    readPendingFiles()
  }

  const remove = async (item: StoredFile) => {
    if (window.confirm(`Delete “${item.name}”?`)) await deleteFile(item.id)
  }

  return (
    <>
      <Header back={back} title={folder.name} subtitle={`${folderTypeLabel(folder)} folder`} />

      <h2 className="section-header">Content</h2>
      {items && items.length > 0 ? (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id}>
              <ContentItemRow item={item} onDelete={() => remove(item)} />
            </li>
          ))}
        </ul>
      ) : (
        items && <p className="hint-text">Add slides, notes or readings for this folder.</p>
      )}
      <div className="button-row spaced">
        <FilePicker multiple className="primary" onFiles={upload}>
          Upload PDF or PowerPoint
        </FilePicker>
        <button className="secondary" onClick={() => setPasting(true)}>
          Paste text
        </button>
      </div>

      <h2 className="section-header">Flashcards</h2>
      <div className="action-card">
        <p className="row-detail">{cardCount === 0 ? 'No flashcards yet.' : `Deck: ${plural(cardCount, 'flashcard')}`}</p>
        <GenerateButton folderId={folderId} kind="flashcards" />
      </div>

      <h2 className="section-header">Lesson</h2>
      <div className="action-card">
        <p className="row-detail">{hasLesson ? 'Lesson ready.' : 'No lesson yet.'}</p>
        <GenerateButton folderId={folderId} kind="lesson" />
      </div>

      {pasting && (
        <PasteTextSheet
          title="Paste text"
          onSave={(name, text) => addTextToFolder(classId, folderId, name, text)}
          onClose={() => setPasting(false)}
        />
      )}
    </>
  )
}
