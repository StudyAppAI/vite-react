import { useState } from 'react'
import Sheet from './Sheet.tsx'
import { deleteSection, type ClassSection } from '../db.ts'
import { plural } from '../hooks.ts'

interface Props {
  section: ClassSection
  classCount: number
  otherSections: ClassSection[]
  onClose: () => void
}

// Deleting a section that has classes: move them to another section, or
// delete them too.
export default function DeleteSectionSheet({ section, classCount, otherSections, onClose }: Props) {
  const [moveTo, setMoveTo] = useState<number | null>(otherSections[0]?.id ?? null)

  const move = async () => {
    if (moveTo === null) return
    await deleteSection(section.id, moveTo)
    onClose()
  }

  const deleteAll = async () => {
    if (
      window.confirm(
        `Delete the section “${section.name}” and its ${plural(classCount, 'class', 'classes')}?\n\nThis can’t be undone. The classes’ folders, uploaded files and slides, flashcard decks and lessons will be permanently deleted.`,
      )
    ) {
      await deleteSection(section.id, null)
      onClose()
    }
  }

  return (
    <Sheet title={`Delete “${section.name}”`} onClose={onClose}>
      <div className="sheet-body sheet-scroll">
        <p className="notice-text">
          This section has {plural(classCount, 'class', 'classes')}. Move them to another section first, or delete them
          with the section.
        </p>
        {otherSections.length > 0 && (
          <>
            <label className="field-label" htmlFor="move-to">
              Move the classes to
            </label>
            <select
              id="move-to"
              className="text-input"
              value={moveTo ?? ''}
              onChange={(e) => setMoveTo(Number(e.target.value))}
            >
              {otherSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="primary block" onClick={move}>
              Move classes and delete section
            </button>
          </>
        )}
        <button className="danger block bordered" onClick={deleteAll}>
          Delete section and its {plural(classCount, 'class', 'classes')}
        </button>
      </div>
    </Sheet>
  )
}
