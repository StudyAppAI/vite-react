import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import NameSheet from '../components/NameSheet.tsx'
import LearnTopicButton from '../components/LearnTopicButton.tsx'
import { ManageLabelsSheet } from '../components/LabelSheets.tsx'
import { GripIcon, TrashIcon } from '../components/icons.tsx'
import {
  addClass,
  db,
  deleteClass,
  getClassesInOrder,
  getLabelsInOrder,
  placeClass,
  renameClass,
  type StudyClass,
} from '../db.ts'
import { plural } from '../hooks.ts'

// How long a finger must rest on a class before it can be dragged.
const HOLD_MS = 350

interface Section {
  key: string
  labelId: number | null
  title: string
  ids: number[]
}

interface Press {
  classId: number
  pointerId: number
  startX: number
  startY: number
  timer: ReturnType<typeof setTimeout> | undefined
  // The page-wide listeners for this press, so they can be removed later.
  move: (e: globalThis.PointerEvent) => void
  up: (e: globalThis.PointerEvent) => void
}

export default function ClassesScreen() {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.folders.each((f) => counts.set(f.classId, (counts.get(f.classId) ?? 0) + 1))
    return { classes: await getClassesInOrder(), labels: await getLabelsInOrder(), counts }
  })
  const [adding, setAdding] = useState(false)
  const [managingLabels, setManagingLabels] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  // While dragging: the class being moved and the sections as they would be if it were dropped now.
  const [drag, setDrag] = useState<{ classId: number; sections: Section[] } | null>(null)

  const press = useRef<Press | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag
  const justDragged = useRef(false)
  const sectionEls = useRef(new Map<string, HTMLElement>())
  const rowEls = useRef(new Map<number, HTMLElement>())

  // While a class is being dragged, stop the page from scrolling under the finger.
  useEffect(() => {
    const stopScroll = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault()
    }
    document.addEventListener('touchmove', stopScroll, { passive: false })
    return () => document.removeEventListener('touchmove', stopScroll)
  }, [])

  if (!data) return null
  const { classes, labels, counts } = data
  const byId = new Map(classes.map((c) => [c.id, c]))
  const knownLabel = (id: number | null) => id !== null && labels.some((l) => l.id === id)

  // One section per label (in label order), then classes without a label.
  const savedSections: Section[] = [
    ...labels.map((l) => ({
      key: `label-${l.id}`,
      labelId: l.id,
      title: l.name,
      ids: classes.filter((c) => c.labelId === l.id).map((c) => c.id),
    })),
    {
      key: 'none',
      labelId: null,
      title: labels.length > 0 ? 'No label' : '',
      ids: classes.filter((c) => !knownLabel(c.labelId)).map((c) => c.id),
    },
  ]
  const sections = drag?.sections ?? savedSections

  // ---------- Dragging ----------

  const startDrag = (classId: number) => {
    navigator.vibrate?.(10)
    setEditingId(null)
    setDrag({ classId, sections: savedSections })
  }

  // Works out where the dragged class would land for a finger at height y.
  const moveDragTo = (y: number) => {
    const current = dragRef.current
    if (!current) return
    let target = current.sections[0]
    let best = Infinity
    for (const s of current.sections) {
      const rect = sectionEls.current.get(s.key)?.getBoundingClientRect()
      if (!rect) continue
      const distance = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0
      if (distance < best) {
        best = distance
        target = s
      }
    }
    const others = target.ids.filter((id) => id !== current.classId)
    const index = others.filter((id) => {
      const rect = rowEls.current.get(id)?.getBoundingClientRect()
      return rect ? rect.top + rect.height / 2 < y : false
    }).length
    const next = current.sections.map((s) => {
      const ids = s.ids.filter((id) => id !== current.classId)
      if (s.key === target.key) ids.splice(index, 0, current.classId)
      return { ...s, ids }
    })
    if (JSON.stringify(next.map((s) => s.ids)) !== JSON.stringify(current.sections.map((s) => s.ids))) {
      setDrag({ classId: current.classId, sections: next })
    }
    // Scroll when the finger nears the top or bottom of the screen.
    if (y < 90) window.scrollBy(0, -14)
    else if (y > window.innerHeight - 150) window.scrollBy(0, 14)
  }

  const finishDrag = async () => {
    const current = dragRef.current
    if (!current) return
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 50)
    const target = current.sections.find((s) => s.ids.includes(current.classId))!
    const ordered = current.sections.flatMap((s) => s.ids)
    const unchanged =
      JSON.stringify(current.sections.map((s) => s.ids)) === JSON.stringify(savedSections.map((s) => s.ids))
    if (!unchanged) await placeClass(current.classId, target.labelId, ordered)
    setDrag(null)
  }

  const endPress = () => {
    const p = press.current
    if (!p) return
    if (p.timer) clearTimeout(p.timer)
    window.removeEventListener('pointermove', p.move)
    window.removeEventListener('pointerup', p.up)
    window.removeEventListener('pointercancel', p.up)
    press.current = null
  }

  function onWindowMove(e: globalThis.PointerEvent) {
    const p = press.current
    if (!p || e.pointerId !== p.pointerId) return
    if (dragRef.current) {
      moveDragTo(e.clientY)
      return
    }
    const moved = Math.hypot(e.clientX - p.startX, e.clientY - p.startY)
    if (e.pointerType === 'mouse' && moved > 6) {
      startDrag(p.classId)
    } else if (e.pointerType !== 'mouse' && moved > 10) {
      endPress() // the finger is scrolling the page, not holding a class
    }
  }

  function onWindowUp(e: globalThis.PointerEvent) {
    if (press.current && e.pointerId !== press.current.pointerId) return
    endPress()
    finishDrag()
  }

  // Press and hold a class (or drag its grip) to move it.
  const onRowPointerDown = (e: PointerEvent, classId: number, fromGrip = false) => {
    if (e.button !== 0 || editingId === classId || dragRef.current) return
    endPress()
    press.current = {
      classId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      timer:
        e.pointerType === 'mouse'
          ? undefined
          : setTimeout(() => startDrag(classId), fromGrip ? 0 : HOLD_MS),
      move: onWindowMove,
      up: onWindowUp,
    }
    window.addEventListener('pointermove', onWindowMove)
    window.addEventListener('pointerup', onWindowUp)
    window.addEventListener('pointercancel', onWindowUp)
  }

  // ---------- Tapping ----------

  const open = (c: StudyClass) => {
    if (justDragged.current || drag) return
    navigate(`/classes/${c.id}`)
  }

  // Tapping the name turns it into a text box with the name selected.
  // flushSync keeps the focus inside the tap so the iPhone keyboard opens.
  const startRename = (c: StudyClass) => {
    if (justDragged.current || drag) return
    flushSync(() => setEditingId(c.id))
    const input = document.getElementById(`class-name-${c.id}`) as HTMLInputElement | null
    input?.focus()
    input?.select()
  }

  const saveRename = async (c: StudyClass, value: string) => {
    setEditingId(null)
    const name = value.trim()
    if (name && name !== c.name) await renameClass(c.id, name)
  }

  const onNameKey = (e: KeyboardEvent<HTMLInputElement>, c: StudyClass) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      e.currentTarget.value = c.name
      e.currentTarget.blur()
    }
  }

  const remove = async (c: StudyClass) => {
    if (
      window.confirm(
        `Delete “${c.name}”?\n\nThis can’t be undone. Its folders, uploaded files and slides, flashcard decks and lessons will be permanently deleted.`,
      )
    ) {
      await deleteClass(c.id)
    }
  }

  // ---------- Drawing ----------

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
          <div className="toolbar-row between">
            <p className="hint-text tight">Tap a name to rename it. Press and hold a class to move it.</p>
            <button className="text-action" onClick={() => setManagingLabels(true)}>
              Manage labels
            </button>
          </div>

          {sections
            .filter((s) => s.key !== 'none' || s.ids.length > 0 || labels.length > 0)
            .map((section) => (
              <section
                key={section.key}
                className="class-section"
                ref={(el) => {
                  if (el) sectionEls.current.set(section.key, el)
                  else sectionEls.current.delete(section.key)
                }}
              >
                {section.title && <h2 className="section-header">{section.title}</h2>}
                {section.ids.length === 0 ? (
                  <div className={`drop-zone ${drag ? 'active' : ''}`}>
                    {drag ? 'Drop here' : 'Drag a class here'}
                  </div>
                ) : (
                  <ul className="list">
                    {section.ids.map((id) => {
                      const c = byId.get(id)
                      if (!c) return null
                      const editing = editingId === c.id
                      return (
                        <li
                          key={c.id}
                          ref={(el) => {
                            if (el) rowEls.current.set(c.id, el)
                            else rowEls.current.delete(c.id)
                          }}
                          className={`class-row ${drag?.classId === c.id ? 'lifted' : ''}`}
                          onPointerDown={(e) => onRowPointerDown(e, c.id)}
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          <span
                            className="grip"
                            title="Drag to move"
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              onRowPointerDown(e, c.id, true)
                            }}
                          >
                            <GripIcon />
                          </span>
                          {editing ? (
                            <input
                              id={`class-name-${c.id}`}
                              className="name-input"
                              defaultValue={c.name}
                              aria-label="Class name"
                              enterKeyHint="done"
                              autoComplete="off"
                              onBlur={(e) => saveRename(c, e.currentTarget.value)}
                              onKeyDown={(e) => onNameKey(e, c)}
                            />
                          ) : (
                            <button
                              className="class-name"
                              title="Tap to rename"
                              aria-label={`Rename ${c.name}`}
                              onClick={() => startRename(c)}
                            >
                              {c.name}
                            </button>
                          )}
                          <button
                            className="open-area"
                            aria-label={`Open ${c.name}`}
                            onClick={() => open(c)}
                          >
                            <span className="row-detail">{plural(counts.get(c.id) ?? 0, 'folder')}</span>
                            <span className="chevron" aria-hidden="true">
                              ›
                            </span>
                          </button>
                          <button
                            className="icon-button trash"
                            aria-label={`Delete ${c.name}`}
                            title="Delete class"
                            onClick={() => remove(c)}
                          >
                            <TrashIcon />
                          </button>
                        </li>
                      )
                    })}
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
      {managingLabels && <ManageLabelsSheet onClose={() => setManagingLabels(false)} />}
    </>
  )
}
