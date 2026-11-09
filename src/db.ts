import Dexie, { type EntityTable } from 'dexie'

export interface StudyClass {
  id: number
  name: string
  createdAt: number
}

export interface Week {
  id: number
  classId: number
  number: number
  createdAt: number
}

export interface Lesson {
  id: number
  weekId: number
  title: string
  notes: string
  createdAt: number
}

export interface Flashcard {
  id: number
  lessonId: number
  front: string
  back: string
  createdAt: number
}

export const db = new Dexie('StudyAppDB') as Dexie & {
  classes: EntityTable<StudyClass, 'id'>
  weeks: EntityTable<Week, 'id'>
  lessons: EntityTable<Lesson, 'id'>
  flashcards: EntityTable<Flashcard, 'id'>
}

db.version(1).stores({
  classes: '++id, name, createdAt',
  weeks: '++id, classId, [classId+number]',
  lessons: '++id, weekId, createdAt',
  flashcards: '++id, lessonId, createdAt',
})

export async function addClass(name: string): Promise<number> {
  return db.classes.add({ name, createdAt: Date.now() })
}

// The new week gets the next number after the highest one in this class.
export async function addWeek(classId: number): Promise<number> {
  return db.transaction('rw', db.weeks, async () => {
    const last = await db.weeks
      .where('[classId+number]')
      .between([classId, Dexie.minKey], [classId, Dexie.maxKey])
      .last()
    const number = last ? last.number + 1 : 1
    return db.weeks.add({ classId, number, createdAt: Date.now() })
  })
}

export async function deleteWeek(weekId: number): Promise<void> {
  await db.transaction('rw', db.weeks, db.lessons, db.flashcards, async () => {
    const lessonIds = (await db.lessons
      .where('weekId')
      .equals(weekId)
      .primaryKeys()) as number[]
    await db.flashcards.where('lessonId').anyOf(lessonIds).delete()
    await db.lessons.where('weekId').equals(weekId).delete()
    await db.weeks.delete(weekId)
  })
}

export async function deleteClass(classId: number): Promise<void> {
  await db.transaction('rw', db.classes, db.weeks, db.lessons, db.flashcards, async () => {
    const weekIds = (await db.weeks
      .where('classId')
      .equals(classId)
      .primaryKeys()) as number[]
    const lessonIds = (await db.lessons
      .where('weekId')
      .anyOf(weekIds)
      .primaryKeys()) as number[]
    await db.flashcards.where('lessonId').anyOf(lessonIds).delete()
    await db.lessons.where('weekId').anyOf(weekIds).delete()
    await db.weeks.where('classId').equals(classId).delete()
    await db.classes.delete(classId)
  })
}
