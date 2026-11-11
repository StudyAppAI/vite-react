import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import NameSheet from '../components/NameSheet.tsx'
import PasteTextSheet from '../components/PasteTextSheet.tsx'
import Sheet from '../components/Sheet.tsx'
import FilePicker from '../components/FilePicker.tsx'
import ContentItemRow from '../components/ContentItemRow.tsx'
import EditableName from '../components/EditableName.tsx'
import { TrashIcon } from '../components/icons.tsx'
import FolderBadge from '../components/FolderBadge.tsx'
import {
  addFolder,
  db,
  deleteFile,
  deleteFolder,
  getSyllabus,
  moveFolder,
  nextWeekNumber,
  renameFolder,
  setSyllabusFile,
  setSyllabusText,
  type Folder,
} from '../db.ts'
import { readPendingFiles } from '../extract.ts'
import { folderTypeLabel, plural, useFolders } from '../hooks.ts'
import { useClassContext } from './classContext.ts'

// Class page → Course Content tab.
export default function ContentTab() {
  const { studyClass } = useClassContext()
  const classId = studyClass.id
  const folders = useFolders(classId)
  const syllabus = useLiveQuery(() => getSyllabus(classId), [classId], null)
  const itemCounts = useLiveQuery(
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
  const [syllabusSheet, setSyllabusSheet] = useState<'choose' | 'paste' | null>(null)
  const [adding, setAdding] = useState<{ weekSuggestion: string } | null>(null)
  const [reordering, setReordering] = useState(false)

  const uploadSyllabus = async (file: File) => {
    setSyllabusSheet(null)
    await setSyllabusFile(classId, file)
    readPendingFiles()
  }

  const startAdding = async () => {
    setAdding({ weekSuggestion: `Week ${await nextWeekNumber(classId)}` })
  }

  const removeFolder = async (f: Folder) => {
    if (
      window.confirm(
        `Delete “${f.name}”?\n\nThis can’t be undone and the folder can’t be recovered. Its uploaded files and slides, pasted text, flashcards and lesson will be permanently deleted.`,
      )
    ) {
      await deleteFolder(f.id)
    }
  }

  const removeSyllabus = async () => {
    if (syllabus && window.confirm(`Delete the syllabus “${syllabus.name}”?`)) await deleteFile(syllabus.id)
  }

  return (
    <>
      <h2 className="section-header">Syllabus</h2>
      {syllabus && (
        <ul className="list">
          <li>
            <ContentItemRow item={syllabus} onDelete={removeSyllabus} />
          </li>
        </ul>
      )}
      {syllabus !== null && (
        <button
          className={syllabus ? 'secondary block spaced' : 'upload-tile'}
          onClick={() => setSyllabusSheet('choose')}
        >
          {!syllabus && <span className="upload-plus">+</span>}
          {syllabus ? 'Replace syllabus' : 'Upload syllabus'}
        </button>
      )}

      <h2 className="section-header">Folders</h2>
      {folders && folders.length === 0 && (
        <p className="hint-text">Add a folder for each week or topic of the class.</p>
      )}
      {folders && folders.length > 1 && (
        <div className="toolbar-row">
          <button className="text-action" onClick={() => setReordering(!reordering)}>
            {reordering ? 'Done reordering' : 'Reorder folders'}
          </button>
        </div>
      )}
      {folders && folders.length > 0 && (
        <ul className="list">
          {folders.map((f, i) => (
            <li key={f.id} className="folder-card">
              <div className="folder-card-top">
                <FolderBadge folder={f} />
                <EditableName
                  value={f.name}
                  what="folder"
                  className="folder-name"
                  onSave={(name) => renameFolder(f.id, name)}
                />
                <button
                  className="icon-button trash"
                  aria-label={`Delete ${f.name}`}
                  title="Delete folder"
                  onClick={() => removeFolder(f)}
                >
                  <TrashIcon />
                </button>
              </div>
              <Link className="folder-open" to={`/classes/${classId}/content/${f.id}`}>
                <span className="row-detail">
                  {folderTypeLabel(f)} · {plural(itemCounts.get(f.id) ?? 0, 'item')}
                </span>
                <span className="open-label">
                  Open folder <span aria-hidden="true">›</span>
                </span>
              </Link>
              {reordering && (
                <div className="item-actions">
                  <button onClick={() => moveFolder(f.id, -1)} disabled={i === 0}>
                    Move up
                  </button>
                  <button onClick={() => moveFolder(f.id, 1)} disabled={i === folders.length - 1}>
                    Move down
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <button className="primary block spaced" onClick={startAdding}>
        + Add folder
      </button>

      {syllabusSheet === 'choose' && (
        <Sheet title={syllabus ? 'Replace syllabus' : 'Upload syllabus'} onClose={() => setSyllabusSheet(null)}>
          <div className="sheet-body">
            <FilePicker className="primary block" onFiles={([f]) => uploadSyllabus(f)}>
              Upload files (PDF, Word, slides)
            </FilePicker>
            <button className="secondary block" onClick={() => setSyllabusSheet('paste')}>
              Paste text
            </button>
          </div>
        </Sheet>
      )}
      {syllabusSheet === 'paste' && (
        <PasteTextSheet
          title="Paste syllabus"
          defaultName="Syllabus"
          onSave={(name, text) => setSyllabusText(classId, name, text)}
          onClose={() => setSyllabusSheet(null)}
        />
      )}
      {adding && (
        <NameSheet
          title="New folder"
          label="Folder name"
          placeholder="Type a name, e.g. Week 3 or Recursion"
          suggestions={[adding.weekSuggestion, 'Topic: ']}
          submitLabel="Add folder"
          onSubmit={async (name) => {
            await addFolder(classId, name)
          }}
          onClose={() => setAdding(null)}
        />
      )}
    </>
  )
}
