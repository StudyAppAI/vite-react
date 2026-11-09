import type { LessonContent } from '../db.ts'

// What the app sends and receives for each AI action. The server keeps the
// pre-written prompt for each action; the app only sends the action name and
// the content below.

export interface NewCard {
  front: string
  back: string
  concept: string
}

export interface ActionRequests {
  makeFlashcards: { title: string; text: string }
  addMoreFlashcards: { title: string; text: string; existingFronts: string[] }
  explainCard: { front: string; back: string }
  generateLesson: { title: string; text: string }
}

export interface ActionResponses {
  makeFlashcards: { cards: NewCard[] }
  addMoreFlashcards: { cards: NewCard[] }
  explainCard: { explanation: string }
  generateLesson: { lesson: LessonContent }
}

export type ActionName = keyof ActionRequests
