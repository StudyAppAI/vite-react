import Dexie, { type EntityTable } from 'dexie'

export type FolderType = 'week' | 'topic'

export interface StudyClass {
  id: number
  name: string
  createdAt: number
}

export interface Folder {
  id: number
  classId: number
  type: FolderType
  name: string
  order: number
  createdAt: number
}

export interface StoredFile {
  id: number
  classId: number
  folderId: number | null // null for the syllabus
  isSyllabus: boolean
  name: string
  mimeType: string
  blob: Blob
  extractedText: string | null // filled in once text extraction exists
  createdAt: number
}

export interface Flashcard {
  id: number
  classId: number
  folderId: number
  front: string
  back: string
  concept: string
  explanation: string | null
  createdAt: number
}

export interface ReviewResult {
  id: number
  flashcardId: number
  correct: boolean
  answeredAt: number
}

export interface LessonConcept {
  heading: string
  paragraph: string
}

export interface LessonSection {
  title: string
  concepts: LessonConcept[]
}

export interface LessonContent {
  title: string
  sections: LessonSection[]
}

export interface Lesson {
  id: number
  classId: number
  folderId: number
  content: LessonContent
  createdAt: number
}

export const db = new Dexie('StudyAppDB') as Dexie & {
  classes: EntityTable<StudyClass, 'id'>
  folders: EntityTable<Folder, 'id'>
  files: EntityTable<StoredFile, 'id'>
  flashcards: EntityTable<Flashcard, 'id'>
  reviewResults: EntityTable<ReviewResult, 'id'>
  lessons: EntityTable<Lesson, 'id'>
}

// Version 1 was the first release: classes, numbered weeks, and empty
// lessons/flashcards tables.
db.version(1).stores({
  classes: '++id, name, createdAt',
  weeks: '++id, classId, [classId+number]',
  lessons: '++id, weekId, createdAt',
  flashcards: '++id, lessonId, createdAt',
})

// Version 2: weeks become folders (Week or Topic). Each folder has one deck
// (its flashcards) and one lesson (unique folderId).
db.version(2)
  .stores({
    classes: '++id, name, createdAt',
    weeks: null,
    folders: '++id, classId, [classId+order]',
    files: '++id, classId, folderId',
    flashcards: '++id, classId, folderId',
    reviewResults: '++id, flashcardId, answeredAt',
    lessons: '++id, classId, &folderId',
  })
  .upgrade(async (tx) => {
    const weeks = await tx.table('weeks').toArray()
    await tx.table('folders').bulkAdd(
      weeks.map((w) => ({
        classId: w.classId,
        type: 'week',
        name: `Week ${w.number}`,
        order: w.number,
        createdAt: w.createdAt,
      })),
    )
    // Version 1 never had a way to create lessons or flashcards.
    await tx.table('lessons').clear()
    await tx.table('flashcards').clear()
  })

// Version 3: the flashcards, answers and lessons saved so far were all made
// by stand-in sample data, not by the user, so they are removed.
db.version(3)
  .stores({})
  .upgrade(async (tx) => {
    await tx.table('flashcards').clear()
    await tx.table('reviewResults').clear()
    await tx.table('lessons').clear()
  })

// ---------- Classes ----------

export async function addClass(name: string): Promise<number> {
  return db.classes.add({ name, createdAt: Date.now() })
}

export async function deleteClass(classId: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.classes, db.folders, db.files, db.flashcards, db.reviewResults, db.lessons],
    async () => {
      const cardIds = (await db.flashcards
        .where('classId')
        .equals(classId)
        .primaryKeys()) as number[]
      await db.reviewResults.where('flashcardId').anyOf(cardIds).delete()
      await db.flashcards.where('classId').equals(classId).delete()
      await db.lessons.where('classId').equals(classId).delete()
      await db.files.where('classId').equals(classId).delete()
      await db.folders.where('classId').equals(classId).delete()
      await db.classes.delete(classId)
    },
  )
}

// ---------- Folders ----------

export async function getFoldersForClass(classId: number): Promise<Folder[]> {
  return db.folders
    .where('[classId+order]')
    .between([classId, Dexie.minKey], [classId, Dexie.maxKey])
    .toArray()
}

export async function nextWeekNumber(classId: number): Promise<number> {
  const folders = await db.folders.where('classId').equals(classId).toArray()
  return folders.filter((f) => f.type === 'week').length + 1
}

export async function addFolder(classId: number, type: FolderType, name: string): Promise<number> {
  return db.transaction('rw', db.folders, async () => {
    const last = await db.folders
      .where('[classId+order]')
      .between([classId, Dexie.minKey], [classId, Dexie.maxKey])
      .last()
    return db.folders.add({
      classId,
      type,
      name,
      order: last ? last.order + 1 : 1,
      createdAt: Date.now(),
    })
  })
}

export async function deleteFolder(folderId: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.folders, db.files, db.flashcards, db.reviewResults, db.lessons],
    async () => {
      const cardIds = (await db.flashcards
        .where('folderId')
        .equals(folderId)
        .primaryKeys()) as number[]
      await db.reviewResults.where('flashcardId').anyOf(cardIds).delete()
      await db.flashcards.where('folderId').equals(folderId).delete()
      await db.lessons.where('folderId').equals(folderId).delete()
      await db.files.where('folderId').equals(folderId).delete()
      await db.folders.delete(folderId)
    },
  )
}

// ---------- Files ----------

function toStoredFile(classId: number, folderId: number | null, file: File) {
  return {
    classId,
    folderId,
    isSyllabus: folderId === null,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    blob: file,
    extractedText: null,
    createdAt: Date.now(),
  }
}

export async function addFilesToFolder(
  classId: number,
  folderId: number,
  files: File[],
): Promise<void> {
  await db.files.bulkAdd(files.map((f) => toStoredFile(classId, folderId, f)))
}

export async function getSyllabus(classId: number): Promise<StoredFile | undefined> {
  return db.files
    .where('classId')
    .equals(classId)
    .filter((f) => f.isSyllabus)
    .first()
}

// A class has one syllabus, so uploading a new one replaces the old one.
export async function setSyllabus(classId: number, file: File): Promise<void> {
  await db.transaction('rw', db.files, async () => {
    await db.files
      .where('classId')
      .equals(classId)
      .filter((f) => f.isSyllabus)
      .delete()
    await db.files.add(toStoredFile(classId, null, file))
  })
}

export async function deleteFile(fileId: number): Promise<void> {
  await db.files.delete(fileId)
}

// ---------- Flashcards ----------

export async function saveReviewResult(flashcardId: number, correct: boolean): Promise<void> {
  await db.reviewResults.add({ flashcardId, correct, answeredAt: Date.now() })
}
