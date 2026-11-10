import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import NameSheet from '../components/NameSheet.tsx'
import LearnTopicButton from '../components/LearnTopicButton.tsx'
import { ChangeLabelSheet, ManageLabelsSheet } from '../components/LabelSheets.tsx'
import {
  addClass,
  db,
  deleteClass,
  getClassesInOrder,
  getLabelsInOrder,
  moveClass,
  renameClass,
  type StudyClass,
} from '../db.ts'
import { plural } from '../hooks.ts'

export default function ClassesScreen() {
  const data = useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.folders.each((f) => counts.set(f.classId, (counts.get(f.classId) ?? 0) + 1))
    return { classes: await getClassesInOrder(), labels: await getLabelsInOrder(), counts }
  })
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<StudyClass | null>(null)
  const [labelling, setLabelling] = useState<StudyClass | null>(null)
  const [managingLabels, setManagingLabels] = useState(false)
  const [reordering, setReordering] = useState(false)

  if (!data) return null
  const { classes, labels, counts } = data

  const remove = async (c: StudyClass) => {
    if (window.confirm(`Delete “${c.name}”? Its folders, content, flashcards and lessons will be deleted too.`)) {
      await deleteClass(c.id)
    }
  }

  // One section per label (in label order), then classes without a label.
  const sections = [
    ...labels.map((l) => ({ key: `label-${l.id}`, title: l.name, items: classes.filter((c) => c.labelId === l.id) })),
    {
      key: 'none',
      title: labels.length > 0 ? 'No label' : '',
      items: classes.filter((c) => c.labelId === null || !labels.some((l) => l.id === c.labelId)),
    },
  ].filter((s) => s.items.length > 0 || s.key !== 'none')

  return (
    <>
      <Header title="Classes" />
      <div className="button-row">
        <button className="primary" onClick={() => setAdding(true)}>
          + Add class
        </button>
        <LearnTopicButton className="secondary" />
      </div>

      {classes.length === 0 ? (
        <p className="empty">No classes yet. Tap “+ Add class” to add your first one.</p>
      ) : (
        <>
          <div className="toolbar-row">
            <button className="text-action" onClick={() => setReordering(!reordering)}>
              {reordering ? 'Done reordering' : 'Reorder classes'}
            </button>
            <button className="text-action" onClick={() => setManagingLabels(true)}>
              Manage labels
            </button>
          </div>

          {sections.map((section) => (
            <section key={section.key}>
              {section.title && <h2 className="section-header">{section.title}</h2>}
              {section.items.length === 0 ? (
                <p className="hint-text">No classes with this label yet. Use “Change label” on a class.</p>
              ) : (
                <ul className="list">
                  {section.items.map((c, i) => (
                    <li key={c.id} className="managed-item">
                      <Link className="row" to={`/classes/${c.id}`}>
                        <span className="row-title strong">{c.name}</span>
                        <span className="row-detail">{plural(counts.get(c.id) ?? 0, 'folder')}</span>
                        <span className="chevron" aria-hidden="true">›</span>
                      </Link>
                      {reordering ? (
                        <div className="item-actions">
                          <button onClick={() => moveClass(c.id, -1)} disabled={i === 0}>
                            Move up
                          </button>
                          <button onClick={() => moveClass(c.id, 1)} disabled={i === section.items.length - 1}>
                            Move down
                          </button>
                        </div>
                      ) : (
                        <div className="item-actions">
                          <button onClick={() => setRenaming(c)}>Rename class</button>
                          <button onClick={() => setLabelling(c)}>Change label</button>
                          <button className="danger-text" onClick={() => remove(c)}>
                            Delete class
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}

      {adding && (
        <NameSheet
          title="New class"
          label="Class name"
          placeholder="e.g. CS 101"
          submitLabel="Add class"
          onSubmit={async (name) => {
            await addClass(name)
          }}
          onClose={() => setAdding(false)}
        />
      )}
      {renaming && (
        <NameSheet
          title="Rename class"
          label="Class name"
          initial={renaming.name}
          submitLabel="Save class name"
          onSubmit={(name) => renameClass(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      )}
      {labelling && <ChangeLabelSheet studyClass={labelling} onClose={() => setLabelling(null)} />}
      {managingLabels && <ManageLabelsSheet onClose={() => setManagingLabels(false)} />}
    </>
  )
}
