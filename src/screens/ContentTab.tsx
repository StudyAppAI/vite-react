import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import NameSheet from '../components/NameSheet.tsx'
import PasteTextSheet from '../components/PasteTextSheet.tsx'
import Sheet from '../components/Sheet.tsx'
import FilePicker from '../components/FilePicker.tsx'
import ContentItemRow from '../components/ContentItemRow.tsx'
import FolderBadge from '../components/FolderBadge.tsx'
import {
  addFolder,
  db,
  deleteFile,
  deleteFolder,
  getSyllabus,
  nextWeekNumber,
  renameFolder,
  setSyllabusFile,
  setSyllabusText,
  type Folder,
  type FolderType,
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
  const [adding, setAdding] = useState<{ type: FolderType; suggested: string } | null>(null)
  const [renaming, setRenaming] = useState<Folder | null>(null)

  const uploadSyllabus = async (file: File) => {
    setSyllabusSheet(null)
    await setSyllabusFile(classId, file)
    readPendingFiles()
  }

  const startAdding = async (type: FolderType) => {
    setAdding({ type, suggested: type === 'week' ? `Week ${await nextWeekNumber(classId)}` : '' })
  }

  const removeFolder = async (f: Folder) => {
    if (window.confirm(`Delete “${f.name}”? Its content, flashcards and lesson will be deleted too.`)) {
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
      {folders && folders.length > 0 && (
        <ul className="list">
          {folders.map((f) => (
            <li key={f.id} className="managed-item">
              <Link className="row" to={`/classes/${classId}/content/${f.id}`}>
                <FolderBadge folder={f} />
                <span className="row-text">
                  <span className="row-title">{f.name}</span>
                  <span className="row-detail">
                    {folderTypeLabel(f)} · {plural(itemCounts.get(f.id) ?? 0, 'item')}
                  </span>
                </span>
                <span className="chevron" aria-hidden="true">›</span>
              </Link>
              <div className="item-actions">
                <button onClick={() => setRenaming(f)}>Rename folder</button>
                <button className="danger-text" onClick={() => removeFolder(f)}>
                  Delete folder
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="button-row spaced">
        <button className="primary" onClick={() => startAdding('week')}>
          + Add week folder
        </button>
        <button className="primary topic" onClick={() => startAdding('topic')}>
          + Add topic folder
        </button>
      </div>

      {syllabusSheet === 'choose' && (
        <Sheet title={syllabus ? 'Replace syllabus' : 'Upload syllabus'} onClose={() => setSyllabusSheet(null)}>
          <div className="sheet-body">
            <FilePicker className="primary block" onFiles={([f]) => uploadSyllabus(f)}>
              Upload PDF or PowerPoint
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
          title={adding.type === 'week' ? 'New week folder' : 'New topic folder'}
          label="Folder name"
          initial={adding.suggested}
          placeholder={adding.type === 'week' ? 'e.g. Week 3' : 'e.g. Recursion'}
          submitLabel={adding.type === 'week' ? 'Add week folder' : 'Add topic folder'}
          onSubmit={async (name) => {
            await addFolder(classId, adding.type, name)
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {renaming && (
        <NameSheet
          title="Rename folder"
          label="Folder name"
          initial={renaming.name}
          submitLabel="Save folder name"
          onSubmit={(name) => renameFolder(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      )}
    </>
  )
}
