// Every AI button in the app goes through this module.
//
// The app sends only an action name plus the content for that action. The
// pre-written prompts and the Claude API key live on the server (a Supabase
// Edge Function). The API key must never be added to this app.
//
// Right now callServer() returns fake data from fakeServer.ts. Switching to
// the real server function only means changing the inside of callServer().

import { db, type Flashcard, type Lesson } from '../db.ts'
import { fakeServer } from './fakeServer.ts'
import type { ActionName, ActionRequests, ActionResponses, NewCard } from './types.ts'

export class AiActionError extends Error {}

async function callServer<A extends ActionName>(
  action: A,
  content: ActionRequests[A],
): Promise<ActionResponses[A]> {
  if (!navigator.onLine) {
    throw new AiActionError('You’re offline. Connect to the internet to generate new content.')
  }
  return fakeServer(action, content)
}

// The folder's name and the text of all of its files.
async function getFolderContent(folderId: number) {
  const folder = await db.folders.get(folderId)
  if (!folder) throw new AiActionError('This folder no longer exists.')
  const files = await db.files.where('folderId').equals(folderId).toArray()
  if (files.length === 0) {
    throw new AiActionError('Upload at least one file to this folder first.')
  }
  const text = files
    .map((f) => f.extractedText ?? '')
    .filter(Boolean)
    .join('\n\n')
  return { folder, title: folder.name, text }
}

function toFlashcards(classId: number, folderId: number, cards: NewCard[]) {
  const now = Date.now()
  return cards.map((c, i) => ({
    classId,
    folderId,
    front: c.front,
    back: c.back,
    concept: c.concept,
    explanation: null,
    createdAt: now + i,
  }))
}

// Makes the folder's deck. If the folder already has cards, they are replaced.
// Returns the number of cards made.
export async function makeFlashcards(folderId: number): Promise<number> {
  const { folder, title, text } = await getFolderContent(folderId)
  const { cards } = await callServer('makeFlashcards', { title, text })

  await db.transaction('rw', db.flashcards, db.reviewResults, async () => {
    const oldIds = (await db.flashcards
      .where('folderId')
      .equals(folderId)
      .primaryKeys()) as number[]
    await db.reviewResults.where('flashcardId').anyOf(oldIds).delete()
    await db.flashcards.where('folderId').equals(folderId).delete()
    await db.flashcards.bulkAdd(toFlashcards(folder.classId, folderId, cards))
  })
  return cards.length
}

// Adds new cards to the folder's existing deck. Sends the existing fronts so
// the new cards don't repeat them. Returns the number of cards added.
export async function addMoreFlashcards(folderId: number): Promise<number> {
  const { folder, title, text } = await getFolderContent(folderId)
  const existing = await db.flashcards.where('folderId').equals(folderId).toArray()
  const existingFronts = existing.map((c) => c.front)

  const { cards } = await callServer('addMoreFlashcards', { title, text, existingFronts })

  const seen = new Set(existingFronts.map((f) => f.trim().toLowerCase()))
  const fresh = cards.filter((c) => !seen.has(c.front.trim().toLowerCase()))
  await db.flashcards.bulkAdd(toFlashcards(folder.classId, folderId, fresh))
  return fresh.length
}

// Returns a short explanation of the card's answer. The first time, it asks
// the server and saves the answer on the card; after that the saved one is used.
export async function explainCard(flashcardId: number): Promise<string> {
  const card: Flashcard | undefined = await db.flashcards.get(flashcardId)
  if (!card) throw new AiActionError('This card no longer exists.')
  if (card.explanation) return card.explanation

  const { explanation } = await callServer('explainCard', { front: card.front, back: card.back })
  await db.flashcards.update(flashcardId, { explanation })
  return explanation
}

// Makes the folder's lesson. A folder has one lesson, so this replaces any
// existing one.
export async function generateLesson(folderId: number): Promise<Lesson> {
  const { folder, title, text } = await getFolderContent(folderId)
  const { lesson } = await callServer('generateLesson', { title, text })

  return db.transaction('rw', db.lessons, async () => {
    await db.lessons.where('folderId').equals(folderId).delete()
    const row = { classId: folder.classId, folderId, content: lesson, createdAt: Date.now() }
    const id = await db.lessons.add(row)
    return { ...row, id }
  })
}
