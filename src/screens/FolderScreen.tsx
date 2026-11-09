import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import FilePicker from '../components/FilePicker.tsx'
import FileRow from '../components/FileRow.tsx'
import { addFilesToFolder, db, deleteFile, deleteFolder } from '../db.ts'
import { folderTypeLabel, useIdParam } from '../hooks.ts'

// A folder inside Course Content: its files, Upload files, and the study
// tools that come in a later step.
export default function FolderScreen() {
  const classId = useIdParam('classId')
  const folderId = useIdParam('folderId')
  const navigate = useNavigate()
  const folder = useLiveQuery(() => db.folders.get(folderId), [folderId], null)
  const files = useLiveQuery(() => db.files.where('folderId').equals(folderId).toArray(), [folderId])
  const [editing, setEditing] = useState(false)

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

  const removeFile = async (id: number, name: string) => {
    if (window.confirm(`Delete “${name}”?`)) await deleteFile(id)
  }

  const removeFolder = async () => {
    if (window.confirm(`Delete “${folder.name}” and its files?`)) {
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
      {files && files.length > 0 && (
        <ul className="list">
          {files.map((f) => (
            <li key={f.id}>
              <FileRow file={f} onDelete={editing ? () => removeFile(f.id, f.name) : undefined} />
            </li>
          ))}
        </ul>
      )}
      {files && files.length === 0 && (
        <p className="hint-text">
          Upload slides, notes or readings for this {folderTypeLabel(folder).toLowerCase()}.
        </p>
      )}
      <FilePicker
        multiple
        className="primary block spaced"
        onFiles={(picked) => addFilesToFolder(classId, folderId, picked)}
      >
        Upload files
      </FilePicker>

      <h2 className="section-header">Study tools</h2>
      <div className="action-card">
        {['Make flashcards', 'Add more flashcards', 'Generate lesson'].map((label) => (
          <button key={label} className="secondary coming-soon" disabled>
            <span>{label}</span>
            <span className="soon-label">Coming soon</span>
          </button>
        ))}
      </div>

      {editing && (
        <button className="danger block spaced" onClick={removeFolder}>
          Delete folder
        </button>
      )}
    </>
  )
}
