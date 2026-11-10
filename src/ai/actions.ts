// Every AI button in the app calls generateForFolder() below. It sends the
// action name and the folder's content to /api/generate, which holds the
// prompts and the Claude API key. No prompt text or key is in the app.

import { useSyncExternalStore } from 'react'
import { addMindMapNode, db, type LessonContent, type MindMapNode } from '../db.ts'
import { getToken } from '../auth.ts'

export type GenerateKind = 'flashcards' | 'lesson'

export class GenerateError extends Error {}

// Vercel accepts request bodies up to 4.5 MB.
const MAX_BODY_BYTES = 4_000_000

// ---------- Which folders are generating right now ----------
// Shared by every copy of a button, so the same folder shows "Generating…"
// on every screen and can't be started twice.

const running = new Set<string>()
const listeners = new Set<() => void>()
let snapshot = ''

function setRunning(key: string, on: boolean) {
  if (on) running.add(key)
  else running.delete(key)
  snapshot = [...running].sort().join('|')
  listeners.forEach((l) => l())
}

export function useIsGenerating(folderId: number, kind: GenerateKind): boolean {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => snapshot,
  )
  return current.split('|').includes(`${kind}:${folderId}`)
}

// ---------- Folder content ----------

export async function getFolderText(folderId: number): Promise<string> {
  const items = await db.files.where('folderId').equals(folderId).sortBy('createdAt')
  return items
    .filter((i) => i.extractedText)
    .map((i) => `### ${i.name}\n${i.extractedText}`)
    .join('\n\n')
}

// ---------- Talking to the server ----------

async function callGenerate(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!navigator.onLine) throw new GenerateError('Needs internet. Connect and try again.')

  const body = JSON.stringify(payload)
  if (new Blob([body]).size > MAX_BODY_BYTES) {
    throw new GenerateError(
      'This folder has too much text to send at once. Split its content into smaller folders.',
    )
  }

  let response: Response
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${getToken() ?? ''}` },
      body,
    })
  } catch {
    throw new GenerateError('Couldn’t reach the server. Check your connection and try again.')
  }

  const data = await response.json().catch(() => null)
  if (response.ok && data) return data
  if (typeof data?.error === 'string') throw new GenerateError(data.error)
  if (response.status === 504) {
    throw new GenerateError('This took too long and was stopped. Try again, or split the folder’s content.')
  }
  throw new GenerateError(`Something went wrong on the server (error ${response.status}). Try again.`)
}

function isText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

// ---------- The one function every AI button calls ----------
// kind "flashcards": makes the folder's deck, or adds to it if it has cards.
// kind "lesson": makes the folder's lesson, replacing any existing one.
// Returns a short message saying what happened.

export async function generateForFolder(folderId: number, kind: GenerateKind): Promise<string> {
  const key = `${kind}:${folderId}`
  if (running.has(key)) throw new GenerateError('Already generating for this folder.')
  setRunning(key, true)
  try {
    const folder = await db.folders.get(folderId)
    if (!folder) throw new GenerateError('This folder no longer exists.')
    const studyClass = await db.classes.get(folder.classId)
    const text = await getFolderText(folderId)
    if (!text) throw new GenerateError('Add content first.')

    const base = { className: studyClass?.name ?? '', folderName: folder.name, text }

    if (kind === 'lesson') {
      const data = await callGenerate({ action: 'generateLesson', ...base })
      const lesson = data.lesson as LessonContent | undefined
      if (!lesson || !isText(lesson.title) || !Array.isArray(lesson.sections)) {
        throw new GenerateError('The lesson came back in the wrong format. Try again.')
      }
      await db.transaction('rw', db.lessons, async () => {
        await db.lessons.where('folderId').equals(folderId).delete()
        await db.lessons.add({ classId: folder.classId, folderId, content: lesson, createdAt: Date.now() })
      })
      return 'Lesson ready.'
    }

    const existing = await db.flashcards.where('folderId').equals(folderId).toArray()
    const existingFronts = existing.map((c) => c.front)
    const data = await callGenerate(
      existing.length > 0
        ? { action: 'addMoreFlashcards', ...base, existingFronts }
        : { action: 'generateFlashcards', ...base },
    )
    const cards = Array.isArray(data.cards) ? data.cards : null
    if (!cards) throw new GenerateError('The flashcards came back in the wrong format. Try again.')

    const seen = new Set(existingFronts.map((f) => f.trim().toLowerCase()))
    const now = Date.now()
    const fresh = cards
      .filter((c) => isText(c?.front) && isText(c?.back))
      .filter((c) => {
        const k = c.front.trim().toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .map((c, i) => ({
        classId: folder.classId,
        folderId,
        front: c.front.trim(),
        back: c.back.trim(),
        concept: isText(c.concept) ? c.concept.trim() : '',
        explanation: null,
        createdAt: now + i,
      }))
    await db.flashcards.bulkAdd(fresh)

    const n = fresh.length
    if (existing.length > 0) return n === 0 ? 'No new flashcards were found.' : `Added ${n} flashcard${n === 1 ? '' : 's'}.`
    return `Made ${n} flashcard${n === 1 ? '' : 's'}.`
  } finally {
    setRunning(key, false)
  }
}

// ---------- Several folders at once ----------
// Used by "Generate flashcards for N folders" and "Generate lessons for N
// folders". Runs generateForFolder() for each folder in turn.

export interface BulkResult {
  done: number
  failed: { folderName: string; message: string }[]
}

export async function generateForFolders(
  folderIds: number[],
  kind: GenerateKind,
  onProgress: (finished: number) => void,
): Promise<BulkResult> {
  const result: BulkResult = { done: 0, failed: [] }
  for (const [i, folderId] of folderIds.entries()) {
    try {
      await generateForFolder(folderId, kind)
      result.done++
    } catch (e) {
      const folder = await db.folders.get(folderId)
      result.failed.push({
        folderName: folder?.name ?? 'A folder',
        message: e instanceof Error ? e.message : 'Something went wrong.',
      })
      // Without internet or a valid code, the rest would fail the same way.
      if (e instanceof GenerateError && /internet|access code|reach the server/i.test(e.message)) break
    }
    onProgress(i + 1)
  }
  return result
}

// ---------- Mind map ----------

interface MissingTopic {
  topicKey: string
  topicLabel: string
  className: string
  isNewTopic: boolean
  folderId: number | null
  parentId: number | null // set when adding concepts to a topic already on the map
  concepts: string[]
}

// What the AI could add: a topic for each folder not on the map yet, and
// each flashcard concept not yet inside its folder's topic. Anything the
// user removed from the map counts as present, so it is never added back.
export async function findMissingMindMapItems(): Promise<MissingTopic[]> {
  const all = await db.mindMapNodes.toArray()
  const folders = await db.folders.toArray()
  const classes = new Map((await db.classes.toArray()).map((c) => [c.id, c.name]))
  const conceptsByFolder = new Map<number, Map<string, string>>()
  await db.flashcards.each((card) => {
    const concept = card.concept.trim()
    if (!concept) return
    const map = conceptsByFolder.get(card.folderId) ?? new Map<string, string>()
    if (!map.has(concept.toLowerCase())) map.set(concept.toLowerCase(), concept)
    conceptsByFolder.set(card.folderId, map)
  })

  const missing: MissingTopic[] = []
  for (const folder of folders) {
    const topic = all.find((n) => n.kind === 'topic' && n.folderId === folder.id)
    if (topic?.removed) continue
    const concepts = [...(conceptsByFolder.get(folder.id)?.values() ?? [])]
    const present = new Set(
      all.filter((n) => n.parentId === topic?.id && topic).map((n) => n.label.toLowerCase()),
    )
    const newConcepts = topic ? concepts.filter((c) => !present.has(c.toLowerCase())) : concepts
    if (topic && newConcepts.length === 0) continue
    missing.push({
      topicKey: topic ? `node:${topic.id}` : `folder:${folder.id}`,
      topicLabel: folder.name,
      className: classes.get(folder.classId) ?? '',
      isNewTopic: !topic,
      folderId: folder.id,
      parentId: topic?.id ?? null,
      concepts: newConcepts,
    })
  }
  return missing
}

// Asks the AI to place the missing topics and concepts, then adds only those
// new circles. Circles already on the map are never changed.
export async function addMindMapNodesWithAI(): Promise<string> {
  const missing = await findMissingMindMapItems()
  if (missing.length === 0) return 'Your mind map already has every topic and concept.'

  const nodes = (await db.mindMapNodes.toArray()).filter((n) => !n.removed)
  const existing = nodes.map((n) => ({
    key: `node:${n.id}`,
    kind: n.kind,
    label: n.label,
    topicKey: n.parentId ? `node:${n.parentId}` : undefined,
    x: Math.round(n.x),
    y: Math.round(n.y),
    r: Math.round(n.r),
  }))
  const add = missing.map(({ topicKey, topicLabel, className, isNewTopic, concepts }) => ({
    topicKey,
    topicLabel,
    className,
    isNewTopic,
    concepts,
  }))

  const data = await callGenerate({ action: 'placeMindMapNodes', existing, add })
  const topics = Array.isArray(data.topics) ? data.topics : []
  const concepts = Array.isArray(data.concepts) ? data.concepts : []
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

  // Map each topic key to the id of its circle (existing or newly added).
  const keyToNode = new Map<string, MindMapNode | { id: number; x: number; y: number; r: number }>()
  for (const n of nodes) if (n.kind === 'topic') keyToNode.set(`node:${n.id}`, n)

  let added = 0
  for (const item of missing.filter((m) => m.isNewTopic)) {
    const placed = topics.find((t) => t?.key === item.topicKey)
    if (!placed || !num(placed.x) || !num(placed.y) || !num(placed.r)) continue
    const node = {
      kind: 'topic' as const,
      label: item.topicLabel,
      sublabel: item.className,
      folderId: item.folderId,
      parentId: null,
      x: placed.x,
      y: placed.y,
      r: Math.min(400, Math.max(100, placed.r)),
      createdBy: 'ai' as const,
    }
    const id = await addMindMapNode(node)
    keyToNode.set(item.topicKey, { id, x: node.x, y: node.y, r: node.r })
    added++
  }

  for (const item of missing) {
    const topic = keyToNode.get(item.topicKey)
    if (!topic) continue
    const wanted = new Map(item.concepts.map((c) => [c.toLowerCase(), c]))
    for (const c of concepts) {
      if (c?.topicKey !== item.topicKey || typeof c.label !== 'string') continue
      const label = wanted.get(c.label.toLowerCase())
      if (!label || !num(c.x) || !num(c.y)) continue
      wanted.delete(c.label.toLowerCase())
      await addMindMapNode({
        kind: 'concept',
        label,
        sublabel: '',
        folderId: null,
        parentId: topic.id,
        x: c.x,
        y: c.y,
        r: 40,
        createdBy: 'ai',
      })
      added++
    }
  }

  return added === 0 ? 'The AI didn’t place any new circles. Try again.' : `Added ${added} circle${added === 1 ? '' : 's'} to your mind map.`
}
