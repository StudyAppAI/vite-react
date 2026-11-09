import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import AddFolderSheet from '../components/AddFolderSheet.tsx'
import FilePicker from '../components/FilePicker.tsx'
import FileRow from '../components/FileRow.tsx'
import FolderBadge from '../components/FolderBadge.tsx'
import { db, deleteFile, deleteFolder, getSyllabus, setSyllabus } from '../db.ts'
import { plural, useCardCounts, useClass, useFolders, useIdParam, folderTypeLabel } from '../hooks.ts'
import MissingClass from './MissingClass.tsx'

export default function ContentScreen() {
  const classId = useIdParam('classId')
  const studyClass = useClass(classId)
  const folders = useFolders(classId)
  const cardCounts = useCardCounts()
  const syllabus = useLiveQuery(() => getSyllabus(classId), [classId], null)
  const fileCounts = useLiveQuery(
    async () => {
      const counts = new Map<number, number>()
      await db.files
        .where('classId')
        .equals(classId)
        .each((f) => f.folderId !== null && counts.set(f.folderId, (counts.get(f.folderId) ?? 0) + 1))
      return counts
    },
    [classId],
    new Map<number, number>(),
  )
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)

  if (studyClass === null) return null
  if (studyClass === undefined) return <MissingClass />

  const removeFolder = async (id: number, name: string) => {
    if (window.confirm(`Delete “${name}” with its files, flashcards and lesson?`)) {
      await deleteFolder(id)
    }
  }

  const removeSyllabus = async () => {
    if (syllabus && window.confirm('Delete the syllabus?')) await deleteFile(syllabus.id)
  }

  return (
    <>
      <Header
        back={{ to: `/classes/${classId}`, label: studyClass.name }}
        title="Course Content"
        right={
          <button className="nav-button" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        }
      />

      <h2 className="section-header">Syllabus</h2>
      {syllabus ? (
        <>
          <ul className="list">
            <li>
              <FileRow file={syllabus} onDelete={editing ? removeSyllabus : undefined} />
            </li>
          </ul>
          <FilePicker className="text-button" onFiles={([f]) => setSyllabus(classId, f)}>
            Replace syllabus
          </FilePicker>
        </>
      ) : (
        syllabus === undefined && (
          <FilePicker className="upload-tile" onFiles={([f]) => setSyllabus(classId, f)}>
            <span className="upload-plus">+</span>
            Upload syllabus
          </FilePicker>
        )
      )}

      <h2 className="section-header">Folders</h2>
      {folders && folders.length > 0 && (
        <ul className="list">
          {folders.map((f) => {
            const files = fileCounts.get(f.id) ?? 0
            const cards = cardCounts.get(f.id) ?? 0
            return (
              <li key={f.id}>
                {editing ? (
                  <div className="row">
                    <FolderBadge folder={f} />
                    <span className="row-title">{f.name}</span>
                    <button className="delete-button" onClick={() => removeFolder(f.id, f.name)}>
                      Delete
                    </button>
                  </div>
                ) : (
                  <Link className="row" to={`/classes/${classId}/content/${f.id}`}>
                    <FolderBadge folder={f} />
                    <span className="row-text">
                      <span className="row-title">{f.name}</span>
                      <span className="row-detail">
                        {folderTypeLabel(f)} · {plural(files, 'file')} · {plural(cards, 'card')}
                      </span>
                    </span>
                    <span className="chevron" aria-hidden="true">›</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <button className="primary block spaced" onClick={() => setAdding(true)}>
        + Add folder
      </button>

      {adding && <AddFolderSheet classId={classId} onClose={() => setAdding(false)} />}
    </>
  )
}
