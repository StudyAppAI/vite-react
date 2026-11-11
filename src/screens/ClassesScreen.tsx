import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import NameSheet from '../components/NameSheet.tsx'
import EditableName from '../components/EditableName.tsx'
import DeleteSectionSheet from '../components/DeleteSectionSheet.tsx'
import LearnTopicButton from '../components/LearnTopicButton.tsx'
import { GripIcon, TrashIcon } from '../components/icons.tsx'
import {
  addClass,
  addSection,
  db,
  deleteClass,
  deleteSection,
  getClassesInOrder,
  getSectionsInOrder,
  placeClass,
  renameClass,
  renameSection,
  setSectionOrder,
  type ClassSection,
  type StudyClass,
} from '../db.ts'
import { plural } from '../hooks.ts'

// How long a finger must rest on a class or section before it can be dragged.
const HOLD_MS = 350
const SECTION_SUGGESTIONS = ['Upcoming Courses', 'Current Courses', 'Completed Courses']

interface Group {
  section: ClassSection
  ids: number[] // classes in this section, top to bottom
}

// What is being dragged: one class, or a whole section.
type Dragging = { kind: 'class'; id: number; groups: Group[] } | { kind: 'section'; id: number; groups: Group[] }

interface Press {
  kind: 'class' | 'section'
  id: number
  pointerId: number
  startX: number
  startY: number
  timer: ReturnType<typeof setTimeout> | undefined
  move: (e: globalThis.PointerEvent) => void
  up: (e: globalThis.PointerEvent) => void
}

export default function ClassesScreen() {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const counts = new Map<number, number>()
    await db.folders.each((f) => counts.set(f.classId, (counts.get(f.classId) ?? 0) + 1))
    return { classes: await getClassesInOrder(), sections: await getSectionsInOrder(), counts }
  })
  const [adding, setAdding] = useState<'class' | 'section' | null>(null)
  const [deletingSection, setDeletingSection] = useState<ClassSection | null>(null)
  const [drag, setDrag] = useState<Dragging | null>(null)

  const press = useRef<Press | null>(null)
  const dragRef = useRef(drag)
  dragRef.current = drag
  const justDragged = useRef(false)
  const sectionEls = useRef(new Map<number, HTMLElement>())
  const rowEls = useRef(new Map<number, HTMLElement>())

  // While dragging, stop the page from scrolling under the finger.
  useEffect(() => {
    const stopScroll = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault()
    }
    document.addEventListener('touchmove', stopScroll, { passive: false })
    return () => document.removeEventListener('touchmove', stopScroll)
  }, [])

  if (!data) return null
  const { classes, sections, counts } = data
  const byId = new Map(classes.map((c) => [c.id, c]))

  const savedGroups: Group[] = sections.map((section) => ({
    section,
    ids: classes.filter((c) => c.sectionId === section.id).map((c) => c.id),
  }))
  const groups = drag?.groups ?? savedGroups
  const sameIds = (a: Group[], b: Group[]) =>
    JSON.stringify(a.map((g) => [g.section.id, g.ids])) === JSON.stringify(b.map((g) => [g.section.id, g.ids]))

  // ---------- Dragging ----------

  const startDrag = (kind: 'class' | 'section', id: number) => {
    navigator.vibrate?.(10)
    setDrag({ kind, id, groups: savedGroups } as Dragging)
  }

  const rectOf = (el: HTMLElement | undefined) => el?.getBoundingClientRect()

  // Works out where the dragged item would land for a finger at height y.
  const moveDragTo = (y: number) => {
    const current = dragRef.current
    if (!current) return
    let next: Group[]

    if (current.kind === 'section') {
      const others = current.groups.filter((g) => g.section.id !== current.id)
      const index = others.filter((g) => {
        const r = rectOf(sectionEls.current.get(g.section.id))
        return r ? r.top + r.height / 2 < y : false
      }).length
      next = [...others]
      next.splice(index, 0, current.groups.find((g) => g.section.id === current.id)!)
    } else {
      let target = current.groups[0]
      let best = Infinity
      for (const g of current.groups) {
        const r = rectOf(sectionEls.current.get(g.section.id))
        if (!r) continue
        const distance = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
        if (distance < best) {
          best = distance
          target = g
        }
      }
      const others = target.ids.filter((id) => id !== current.id)
      const index = others.filter((id) => {
        const r = rectOf(rowEls.current.get(id))
        return r ? r.top + r.height / 2 < y : false
      }).length
      next = current.groups.map((g) => {
        const ids = g.ids.filter((id) => id !== current.id)
        if (g.section.id === target.section.id) ids.splice(index, 0, current.id)
        return { ...g, ids }
      })
    }

    if (!sameIds(next, current.groups)) setDrag({ ...current, groups: next })
    // Scroll when the finger nears the top or bottom of the screen.
    if (y < 90) window.scrollBy(0, -14)
    else if (y > window.innerHeight - 150) window.scrollBy(0, 14)
  }

  const finishDrag = async () => {
    const current = dragRef.current
    if (!current) return
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 50)
    if (!sameIds(current.groups, savedGroups)) {
      if (current.kind === 'section') {
        await setSectionOrder(current.groups.map((g) => g.section.id))
      } else {
        const target = current.groups.find((g) => g.ids.includes(current.id))!
        await placeClass(current.id, target.section.id, current.groups.flatMap((g) => g.ids))
      }
    }
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
    if (e.pointerType === 'mouse' && moved > 6) startDrag(p.kind, p.id)
    else if (e.pointerType !== 'mouse' && moved > 10) endPress() // scrolling, not holding
  }

  function onWindowUp(e: globalThis.PointerEvent) {
    if (press.current && e.pointerId !== press.current.pointerId) return
    endPress()
    finishDrag()
  }

  // Press and hold a class or a section title (or drag its grip) to move it.
  const onPressStart = (e: PointerEvent, kind: 'class' | 'section', id: number, fromGrip = false) => {
    if (e.button !== 0 || dragRef.current) return
    if ((e.target as Element).closest('input')) return
    if (fromGrip) e.stopPropagation()
    endPress()
    press.current = {
      kind,
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      timer: e.pointerType === 'mouse' ? undefined : setTimeout(() => startDrag(kind, id), fromGrip ? 0 : HOLD_MS),
      move: onWindowMove,
      up: onWindowUp,
    }
    window.addEventListener('pointermove', onWindowMove)
    window.addEventListener('pointerup', onWindowUp)
    window.addEventListener('pointercancel', onWindowUp)
  }

  // ---------- Tapping ----------

  const notDragging = () => !justDragged.current && !dragRef.current

  const open = (c: StudyClass) => {
    if (notDragging()) navigate(`/classes/${c.id}`)
  }

  const removeClass = async (c: StudyClass) => {
    if (
      window.confirm(
        `Delete “${c.name}”?\n\nThis can’t be undone. Its folders, uploaded files and slides, flashcard decks and lessons will be permanently deleted.`,
      )
    ) {
      await deleteClass(c.id)
    }
  }

  const removeSection = async (g: Group) => {
    if (g.ids.length > 0) {
      setDeletingSection(g.section)
    } else if (window.confirm(`Delete the empty section “${g.section.name}”?\n\nThis can’t be undone.`)) {
      await deleteSection(g.section.id, null)
    }
  }

  // ---------- Drawing ----------

  const draggingSection = drag?.kind === 'section'

  return (
    <>
      <Header title="Classes" />
      <div className="button-row">
        <button className="primary" onClick={() => setAdding('class')}>
          + Add class
        </button>
        <button className="secondary" onClick={() => setAdding('section')}>
          + Add section
        </button>
      </div>
      <LearnTopicButton className="secondary block spaced" />

      {sections.length === 0 ? (
        <p className="empty">No classes yet. Tap “+ Add class” to add your first one.</p>
      ) : (
        <p className="hint-text tight spaced-text">
          Tap a name to rename it. Press and hold a class or a section title to move it.
        </p>
      )}

      {groups.map((g) => (
        <section
          key={g.section.id}
          className={`class-section ${drag?.kind === 'section' && drag.id === g.section.id ? 'lifted' : ''}`}
          ref={(el) => {
            if (el) sectionEls.current.set(g.section.id, el)
            else sectionEls.current.delete(g.section.id)
          }}
        >
          <div
            className="section-title-row"
            onPointerDown={(e) => onPressStart(e, 'section', g.section.id)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span
              className="grip"
              title="Drag to move this section"
              onPointerDown={(e) => onPressStart(e, 'section', g.section.id, true)}
            >
              <GripIcon />
            </span>
            <EditableName
              value={g.section.name}
              what="section"
              className="section-name"
              canEdit={notDragging}
              onSave={(name) => renameSection(g.section.id, name)}
            />
            <span className="section-count">{plural(g.ids.length, 'class', 'classes')}</span>
            <button
              className="icon-button trash"
              aria-label={`Delete section ${g.section.name}`}
              title="Delete section"
              onClick={() => removeSection(g)}
            >
              <TrashIcon />
            </button>
          </div>

          {draggingSection ? null : g.ids.length === 0 ? (
            <div className={`drop-zone ${drag ? 'active' : ''}`}>{drag ? 'Drop here' : 'Drag a class here'}</div>
          ) : (
            <ul className="list">
              {g.ids.map((id) => {
                const c = byId.get(id)
                if (!c) return null
                return (
                  <li
                    key={c.id}
                    ref={(el) => {
                      if (el) rowEls.current.set(c.id, el)
                      else rowEls.current.delete(c.id)
                    }}
                    className={`class-row ${drag?.kind === 'class' && drag.id === c.id ? 'lifted' : ''}`}
                    onPointerDown={(e) => onPressStart(e, 'class', c.id)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <span
                      className="grip"
                      title="Drag to move"
                      onPointerDown={(e) => onPressStart(e, 'class', c.id, true)}
                    >
                      <GripIcon />
                    </span>
                    <EditableName
                      value={c.name}
                      what="class"
                      className="class-name"
                      canEdit={notDragging}
                      onSave={(name) => renameClass(c.id, name)}
                    />
                    <button className="open-area" aria-label={`Open ${c.name}`} onClick={() => open(c)}>
                      <span className="row-detail">{plural(counts.get(c.id) ?? 0, 'folder')}</span>
                      <span className="chevron" aria-hidden="true">
                        ›
                      </span>
                    </button>
                    <button
                      className="icon-button trash"
                      aria-label={`Delete ${c.name}`}
                      title="Delete class"
                      onClick={() => removeClass(c)}
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

      {adding === 'class' && (
        <NameSheet
          title="New class"
          label="Class name"
          placeholder="e.g. CS 101"
          submitLabel="Add class"
          onSubmit={async (name) => {
            await addClass(name)
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {adding === 'section' && (
        <NameSheet
          title="New section"
          label="Section name"
          placeholder="e.g. Current Courses"
          suggestions={SECTION_SUGGESTIONS.filter((s) => !sections.some((x) => x.name === s))}
          submitLabel="Add section"
          onSubmit={async (name) => {
            await addSection(name)
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {deletingSection && (
        <DeleteSectionSheet
          section={deletingSection}
          classCount={classes.filter((c) => c.sectionId === deletingSection.id).length}
          otherSections={sections.filter((s) => s.id !== deletingSection.id)}
          onClose={() => setDeletingSection(null)}
        />
      )}
    </>
  )
}
