import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import NameSheet from '../components/NameSheet.tsx'
import {
  addMindMapNode,
  getMindMapNodes,
  moveMindMapNodes,
  removeMindMapNode,
  updateMindMapNode,
  type MindMapNode,
} from '../db.ts'
import { addMindMapNodesWithAI, findMissingMindMapItems } from '../ai/actions.ts'
import { useOnline } from '../useOnline.ts'
import { plural } from '../hooks.ts'

// screen point = world point * k + (x, y)
interface View {
  x: number
  y: number
  k: number
}

type Gesture =
  | { type: 'pan'; start: { x: number; y: number }; view: View; moved: boolean }
  | {
      type: 'node'
      nodeId: number
      start: { x: number; y: number }
      origin: Map<number, { x: number; y: number }>
      moved: boolean
    }
  | { type: 'pinch'; dist: number; mid: { x: number; y: number }; view: View }

const CONCEPT_R = 40
const MIN_K = 0.15
const MAX_K = 3

const TOPIC_COLORS = ['topic-a', 'topic-b', 'topic-c', 'topic-d', 'topic-e', 'topic-f']

function colorFor(node: MindMapNode): string {
  const key = node.sublabel || node.label
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return TOPIC_COLORS[Math.abs(hash) % TOPIC_COLORS.length]
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// Splits a concept label into up to 3 short lines.
function wrap(text: string, width = 11): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width && line) {
      lines.push(line)
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) lines.push(line)
  if (lines.length > 3) return [...lines.slice(0, 2), shorten(lines.slice(2).join(' '), width)]
  return lines
}

export default function MindMapScreen() {
  const nodes = useLiveQuery(getMindMapNodes)
  const missing = useLiveQuery(async () => {
    const items = await findMissingMindMapItems()
    return items.reduce((sum, i) => sum + (i.isNewTopic ? 1 : 0) + i.concepts.length, 0)
  })
  const online = useOnline()

  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 360, h: 480 })
  const [view, setView] = useState<View>({ x: 180, y: 240, k: 0.6 })
  const [overrides, setOverrides] = useState<Map<number, { x: number; y: number }>>(new Map())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheet, setSheet] = useState<'topic' | 'concept' | 'rename' | null>(null)
  const [aiState, setAiState] = useState<{ running: boolean; message: string | null; error: boolean }>({
    running: false,
    message: null,
    error: false,
  })

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)
  const fittedOnce = useRef(false)

  // Track the canvas size.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fit = useCallback(
    (list: MindMapNode[]) => {
      if (list.length === 0) return
      const minX = Math.min(...list.map((n) => n.x - n.r))
      const maxX = Math.max(...list.map((n) => n.x + n.r))
      const minY = Math.min(...list.map((n) => n.y - n.r))
      const maxY = Math.max(...list.map((n) => n.y + n.r))
      const pad = 24
      const k = Math.min(
        MAX_K,
        Math.max(MIN_K, Math.min((size.w - pad * 2) / (maxX - minX || 1), (size.h - pad * 2) / (maxY - minY || 1))),
      )
      setView({
        k,
        x: size.w / 2 - ((minX + maxX) / 2) * k,
        y: size.h / 2 - ((minY + maxY) / 2) * k,
      })
    },
    [size],
  )

  // Fit the map to the screen the first time it loads.
  useEffect(() => {
    if (!nodes || fittedOnce.current || size.w < 50) return
    fittedOnce.current = true
    if (nodes.length > 0) fit(nodes)
    else setView({ x: size.w / 2, y: size.h / 2, k: 0.6 })
  }, [nodes, size, fit])

  if (!nodes) return null

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const pos = (n: MindMapNode) => overrides.get(n.id) ?? { x: n.x, y: n.y }
  const topics = nodes.filter((n) => n.kind === 'topic')
  const concepts = nodes.filter((n) => n.kind === 'concept')
  const selected = selectedId !== null ? byId.get(selectedId) : undefined

  const toWorld = (p: { x: number; y: number }, v = view) => ({ x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k })
  const local = (e: { clientX: number; clientY: number }) => {
    const rect = box.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const zoomAt = (factor: number, center: { x: number; y: number }, from = view) => {
    const k = Math.min(MAX_K, Math.max(MIN_K, from.k * factor))
    const world = toWorld(center, from)
    setView({ k, x: center.x - world.x * k, y: center.y - world.y * k })
  }

  // ---------- Touch and mouse ----------

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()]
    gesture.current = {
      type: 'pinch',
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      view,
    }
  }

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = local(e)
    pointers.current.set(e.pointerId, p)

    if (pointers.current.size === 2) {
      finishNodeDrag()
      startPinch()
      return
    }
    if (pointers.current.size > 2) return

    const target = (e.target as Element).closest('[data-node]')
    const nodeId = target ? Number(target.getAttribute('data-node')) : null
    const node = nodeId !== null ? byId.get(nodeId) : undefined
    if (node) {
      // Dragging a topic moves its concepts with it.
      const moving = node.kind === 'topic' ? [node, ...concepts.filter((c) => c.parentId === node.id)] : [node]
      gesture.current = {
        type: 'node',
        nodeId: node.id,
        start: toWorld(p),
        origin: new Map(moving.map((n) => [n.id, pos(n)])),
        moved: false,
      }
    } else {
      gesture.current = { type: 'pan', start: p, view, moved: false }
    }
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current
    if (!g) return

    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const k = Math.min(MAX_K, Math.max(MIN_K, g.view.k * (dist / g.dist)))
      const world = { x: (g.mid.x - g.view.x) / g.view.k, y: (g.mid.y - g.view.y) / g.view.k }
      setView({ k, x: mid.x - world.x * k, y: mid.y - world.y * k })
    } else if (g.type === 'pan') {
      const dx = p.x - g.start.x
      const dy = p.y - g.start.y
      if (Math.hypot(dx, dy) > 6) g.moved = true
      setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy })
    } else if (g.type === 'node') {
      const w = toWorld(p)
      const dx = w.x - g.start.x
      const dy = w.y - g.start.y
      if (Math.hypot(dx, dy) * view.k > 6) g.moved = true
      if (!g.moved) return
      const next = new Map<number, { x: number; y: number }>()
      for (const [id, o] of g.origin) next.set(id, { x: o.x + dx, y: o.y + dy })
      setOverrides(next)
    }
  }

  // Saves a finished drag. Positions the user sets are never changed by the AI.
  const finishNodeDrag = () => {
    const g = gesture.current
    if (g?.type !== 'node' || !g.moved) return
    const positions = [...g.origin.keys()].map((id) => ({ id, ...(overrides.get(id) ?? g.origin.get(id)!) }))
    gesture.current = null
    moveMindMapNodes(positions).then(() => setOverrides(new Map()))
  }

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (g?.type === 'node') {
      if (g.moved) finishNodeDrag()
      else setSelectedId(g.nodeId)
      gesture.current = null
    } else if (g?.type === 'pan') {
      if (!g.moved) setSelectedId(null)
      gesture.current = null
    } else if (g?.type === 'pinch') {
      // Lifting one finger of a pinch: carry on panning with the other.
      const rest = [...pointers.current.values()][0]
      gesture.current = rest ? { type: 'pan', start: rest, view, moved: true } : null
    }
  }

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, local(e))
  }

  // ---------- Editing ----------

  const center = toWorld({ x: size.w / 2, y: size.h / 2 })

  const addTopic = async (label: string) => {
    const id = await addMindMapNode({
      kind: 'topic',
      label,
      sublabel: '',
      folderId: null,
      parentId: null,
      x: center.x,
      y: center.y,
      r: 160,
      createdBy: 'user',
    })
    setSelectedId(id)
  }

  // Puts a new concept in a free spot inside its topic.
  const addConcept = async (topic: MindMapNode, label: string) => {
    const t = pos(topic)
    const siblings = concepts.filter((c) => c.parentId === topic.id).map(pos)
    let spot = { x: t.x, y: t.y }
    search: for (const ring of [0, 0.45, 0.68]) {
      const steps = ring === 0 ? 1 : Math.max(6, Math.floor((2 * Math.PI * ring * topic.r) / 90))
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2 - Math.PI / 2
        const candidate = { x: t.x + Math.cos(angle) * ring * topic.r, y: t.y + Math.sin(angle) * ring * topic.r }
        if (siblings.every((s) => Math.hypot(s.x - candidate.x, s.y - candidate.y) > CONCEPT_R * 2 + 6)) {
          spot = candidate
          break search
        }
      }
    }
    await addMindMapNode({
      kind: 'concept',
      label,
      sublabel: '',
      folderId: null,
      parentId: topic.id,
      x: spot.x,
      y: spot.y,
      r: CONCEPT_R,
      createdBy: 'user',
    })
  }

  const remove = async (node: MindMapNode) => {
    const what =
      node.kind === 'topic'
        ? `Delete the topic “${node.label}” and the concepts inside it from your mind map?`
        : `Delete “${node.label}” from your mind map?`
    if (window.confirm(what)) {
      await removeMindMapNode(node.id)
      setSelectedId(null)
    }
  }

  const runAi = async () => {
    setAiState({ running: true, message: null, error: false })
    const wasEmpty = nodes.length === 0
    try {
      const message = await addMindMapNodesWithAI()
      setAiState({ running: false, message, error: false })
      if (wasEmpty) fit(await getMindMapNodes())
    } catch (e) {
      setAiState({
        running: false,
        message: e instanceof Error ? e.message : 'Something went wrong. Try again.',
        error: true,
      })
    }
  }

  // ---------- Drawing ----------

  return (
    <div className="mindmap-page">
      <Header title="Mind map" />

      <div className="mindmap-toolbar">
        <button className="secondary" onClick={() => setSheet('topic')}>
          + Add topic
        </button>
        <button className="secondary" onClick={() => fit(nodes)} disabled={nodes.length === 0}>
          Fit map to screen
        </button>
        <button className="secondary icon" onClick={() => zoomAt(1.25, { x: size.w / 2, y: size.h / 2 })}>
          Zoom in
        </button>
        <button className="secondary icon" onClick={() => zoomAt(0.8, { x: size.w / 2, y: size.h / 2 })}>
          Zoom out
        </button>
      </div>

      <div className="generate mindmap-ai">
        {missing !== undefined && missing > 0 ? (
          <button className="generate-button" disabled={aiState.running || !online} onClick={runAi}>
            {aiState.running && <span className="spinner" aria-hidden="true" />}
            {aiState.running
              ? 'Placing new circles…'
              : `Add ${plural(missing, 'new topic or concept', 'new topics and concepts')} with AI`}
          </button>
        ) : (
          missing === 0 &&
          !aiState.message && (
            <p className="generate-note">
              {nodes.length === 0
                ? 'Make flashcards in your folders, then the AI can add your topics and concepts here.'
                : 'Every folder and flashcard concept is on your map.'}
            </p>
          )
        )}
        {!online && missing !== undefined && missing > 0 && <p className="generate-note">Needs internet</p>}
        {aiState.message && !aiState.running && (
          <p className={`generate-note ${aiState.error ? 'error-text' : 'success-text'}`} role="status">
            {aiState.message}
          </p>
        )}
      </div>

      <div className="mindmap-canvas" ref={box}>
        <svg
          width={size.w}
          height={size.h}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          role="img"
          aria-label="Mind map of your topics and concepts"
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {topics.map((t) => {
              const p = pos(t)
              return (
                <g key={t.id} data-node={t.id} className={`mm-topic ${colorFor(t)} ${selectedId === t.id ? 'selected' : ''}`}>
                  <title>{t.sublabel ? `${t.label} (${t.sublabel})` : t.label}</title>
                  <circle cx={p.x} cy={p.y} r={t.r} />
                  <text x={p.x} y={p.y - t.r + 34} className="mm-topic-label">
                    {shorten(t.label, Math.max(10, Math.floor(t.r / 9)))}
                  </text>
                  {t.sublabel && (
                    <text x={p.x} y={p.y - t.r + 54} className="mm-topic-sublabel">
                      {shorten(t.sublabel, Math.max(10, Math.floor(t.r / 7)))}
                    </text>
                  )}
                </g>
              )
            })}
            {concepts.map((c) => {
              const p = pos(c)
              const lines = wrap(c.label)
              return (
                <g key={c.id} data-node={c.id} className={`mm-concept ${selectedId === c.id ? 'selected' : ''}`}>
                  <title>{c.label}</title>
                  <circle cx={p.x} cy={p.y} r={c.r} />
                  <text x={p.x} y={p.y - (lines.length - 1) * 7 + 4} className="mm-concept-label">
                    {lines.map((line, i) => (
                      <tspan key={i} x={p.x} dy={i === 0 ? 0 : 14}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
        {nodes.length === 0 && (
          <p className="mindmap-empty">
            Your mind map is empty. Tap “+ Add topic”, or let the AI add the topics from your classes.
          </p>
        )}
      </div>

      {selected && (
        <div className="mindmap-selection">
          <p className="selection-title">
            {selected.kind === 'topic' ? 'Topic' : 'Concept'}: <strong>{selected.label}</strong>
          </p>
          <div className="selection-actions">
            {selected.kind === 'topic' && <button onClick={() => setSheet('concept')}>Add concept</button>}
            <button onClick={() => setSheet('rename')}>
              {selected.kind === 'topic' ? 'Rename topic' : 'Rename concept'}
            </button>
            {selected.kind === 'topic' && (
              <>
                <button onClick={() => updateMindMapNode(selected.id, { r: Math.min(500, selected.r + 30) })}>
                  Make circle bigger
                </button>
                <button onClick={() => updateMindMapNode(selected.id, { r: Math.max(90, selected.r - 30) })}>
                  Make circle smaller
                </button>
              </>
            )}
            <button className="danger-text" onClick={() => remove(selected)}>
              {selected.kind === 'topic' ? 'Delete topic' : 'Delete concept'}
            </button>
            <button onClick={() => setSelectedId(null)}>Close options</button>
          </div>
        </div>
      )}

      {sheet === 'topic' && (
        <NameSheet
          title="New topic"
          label="Topic name"
          placeholder="e.g. Recursion"
          submitLabel="Add topic"
          onSubmit={addTopic}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'concept' && selected?.kind === 'topic' && (
        <NameSheet
          title={`New concept in ${selected.label}`}
          label="Concept name"
          placeholder="e.g. Base case"
          submitLabel="Add concept"
          onSubmit={(label) => addConcept(selected, label)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'rename' && selected && (
        <NameSheet
          title={selected.kind === 'topic' ? 'Rename topic' : 'Rename concept'}
          label="Name"
          initial={selected.label}
          submitLabel="Save name"
          onSubmit={(label) => updateMindMapNode(selected.id, { label })}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
