import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import FilePicker from '../components/FilePicker.tsx'
import FileRow from '../components/FileRow.tsx'
import { addFilesToFolder, db, deleteFile, deleteFolder } from '../db.ts'
import { addMoreFlashcards, generateLesson, makeFlashcards } from '../ai/actions.ts'
import { plural, useIdParam, folderTypeLabel } from '../hooks.ts'

type Busy = 'make' | 'more' | 'lesson' | null

export default function FolderScreen() {
  const classId = useIdParam('classId')
  const folderId = useIdParam('folderId')
  const navigate = useNavigate()
  const folder = useLiveQuery(() => db.folders.get(folderId), [folderId], null)
  const files = useLiveQuery(() => db.files.where('folderId').equals(folderId).toArray(), [folderId])
  const cardCount = useLiveQuery(
    () => db.flashcards.where('folderId').equals(folderId).count(),
    [folderId],
    0,
  )
  const lesson = useLiveQuery(() => db.lessons.where('folderId').equals(folderId).first(), [folderId])
  const [busy, setBusy] = useState<Busy>(null)
  const [message, setMessage] = useState<{
    kind: Exclude<Busy, null>
    text: string
    error: boolean
  } | null>(null)
  const [editing, setEditing] = useState(false)

  const back = { to: `/classes/${classId}/content`, label: 'Content' }

  if (folder === null) return null
  if (folder === undefined || folder.classId !== classId) {
    return (
      <>
        <Header back={back} title="Not found" />
        <p className="empty">This folder no longer exists.</p>
      </>
    )
  }

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<string>) => {
    setBusy(kind)
    setMessage(null)
    try {
      setMessage({ kind, text: await action(), error: false })
    } catch (e) {
      setMessage({
        kind,
        text: e instanceof Error ? e.message : 'Something went wrong. Try again.',
        error: true,
      })
    } finally {
      setBusy(null)
    }
  }

  const make = () => {
    if (cardCount > 0 && !window.confirm(`Replace the ${plural(cardCount, 'card')} in this deck?`)) {
      return
    }
    run('make', async () => `Made ${plural(await makeFlashcards(folderId), 'flashcard')}.`)
  }

  const more = () =>
    run('more', async () => `Added ${plural(await addMoreFlashcards(folderId), 'new card')}.`)

  const makeLesson = () => {
    if (lesson && !window.confirm('Replace this folder’s lesson with a new one?')) return
    run('lesson', async () => {
      await generateLesson(folderId)
      return 'Lesson ready.'
    })
  }

  const removeFile = async (id: number, name: string) => {
    if (window.confirm(`Delete “${name}”?`)) await deleteFile(id)
  }

  const removeFolder = async () => {
    if (window.confirm(`Delete “${folder.name}” with its files, flashcards and lesson?`)) {
      await deleteFolder(folderId)
      navigate(back.to, { replace: true })
    }
  }

  return (
    <>
      <Header
        back={back}
        title={folder.name}
        subtitle={folderTypeLabel(folder)}
        right={
          <button className="nav-button" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        }
      />

      <h2 className="section-header">Files</h2>
      {files && files.length > 0 ? (
        <ul className="list">
          {files.map((f) => (
            <li key={f.id}>
              <FileRow file={f} onDelete={editing ? () => removeFile(f.id, f.name) : undefined} />
            </li>
          ))}
        </ul>
      ) : (
        files && <p className="hint-text">Upload slides, notes or readings for this {folderTypeLabel(folder).toLowerCase()}.</p>
      )}
      <FilePicker
        multiple
        className="secondary block spaced"
        onFiles={(picked) => addFilesToFolder(classId, folderId, picked)}
      >
        Upload
      </FilePicker>

      <h2 className="section-header">Flashcards</h2>
      <div className="action-card">
        <p className="row-detail">
          {cardCount === 0 ? 'No deck yet.' : `Deck: ${plural(cardCount, 'card')}`}
        </p>
        <div className="action-buttons">
          <button className="primary" onClick={make} disabled={busy !== null}>
            {busy === 'make' ? 'Making…' : 'Make flashcards'}
          </button>
          <button className="secondary" onClick={more} disabled={busy !== null || cardCount === 0}>
            {busy === 'more' ? 'Adding…' : 'Add more flashcards'}
          </button>
        </div>
        {cardCount > 0 && (
          <Link className="text-link" to={`/classes/${classId}/review/session?folders=${folderId}`}>
            Study this deck ›
          </Link>
        )}
        {message && message.kind !== 'lesson' && <Status {...message} />}
      </div>

      <h2 className="section-header">Lesson</h2>
      <div className="action-card">
        <p className="row-detail">{lesson ? lesson.content.title : 'No lesson yet.'}</p>
        <div className="action-buttons">
          <button className="primary" onClick={makeLesson} disabled={busy !== null}>
            {busy === 'lesson' ? 'Generating…' : 'Generate lesson'}
          </button>
        </div>
        {lesson && (
          <Link className="text-link" to={`/classes/${classId}/learn/${folderId}`}>
            Open lesson ›
          </Link>
        )}
        {message?.kind === 'lesson' && <Status {...message} />}
      </div>

      {editing && (
        <button className="danger block spaced" onClick={removeFolder}>
          Delete folder
        </button>
      )}
    </>
  )
}

function Status({ text, error }: { text: string; error: boolean }) {
  return (
    <p className={error ? 'error' : 'success'} role="status">
      {text}
    </p>
  )
}
