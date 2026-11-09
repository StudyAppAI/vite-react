import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import AddFolderSheet from '../components/AddFolderSheet.tsx'
import FilePicker from '../components/FilePicker.tsx'
import FileRow from '../components/FileRow.tsx'
import FolderBadge from '../components/FolderBadge.tsx'
import { db, deleteFile, deleteFolder, getSyllabus, setSyllabus } from '../db.ts'
import { folderTypeLabel, plural, useFolders } from '../hooks.ts'
import { useClassContext } from './classContext.ts'

// Class page → Course Content tab.
export default function ContentTab() {
  const { studyClass, editing } = useClassContext()
  const classId = studyClass.id
  const folders = useFolders(classId)
  const syllabus = useLiveQuery(() => getSyllabus(classId), [classId], null)
  const fileCounts = useLiveQuery(
    async () => {
      const counts = new Map<number, number>()
      await db.files.where('classId').equals(classId).each((f) => {
        if (f.folderId !== null) counts.set(f.folderId, (counts.get(f.folderId) ?? 0) + 1)
      })
      return counts
    },
    [classId],
    new Map<number, number>(),
  )
  const [adding, setAdding] = useState(false)

  const removeFolder = async (id: number, name: string) => {
    if (window.confirm(`Delete “${name}” and its files?`)) await deleteFolder(id)
  }

  const removeSyllabus = async () => {
    if (syllabus && window.confirm('Delete the syllabus?')) await deleteFile(syllabus.id)
  }

  return (
    <>
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
      {folders && folders.length === 0 && (
        <p className="hint-text">Add a folder for each week or topic of the class.</p>
      )}
      {folders && folders.length > 0 && (
        <ul className="list">
          {folders.map((f) => (
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
                      {folderTypeLabel(f)} · {plural(fileCounts.get(f.id) ?? 0, 'file')}
                    </span>
                  </span>
                  <span className="chevron" aria-hidden="true">›</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <button className="primary block spaced" onClick={() => setAdding(true)}>
        + Add folder
      </button>

      {adding && <AddFolderSheet classId={classId} onClose={() => setAdding(false)} />}
    </>
  )
}
