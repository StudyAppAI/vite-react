// Every AI button in the app calls generateForFolder() below. It sends the
// action name and the folder's content to /api/generate, which holds the
// prompts and the Claude API key. No prompt text or key is in the app.

import { useSyncExternalStore } from 'react'
import { db, type LessonContent } from '../db.ts'
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
