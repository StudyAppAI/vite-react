import Dexie, { type EntityTable } from 'dexie'

export type FolderType = 'week' | 'topic'

export interface StudyClass {
  id: number
  name: string
  order: number // position in the Classes list
  labelId: number | null // e.g. "Current Courses"; null when unlabelled
  createdAt: number
}

// A label that groups classes on the Classes page.
export interface ClassLabel {
  id: number
  name: string
  order: number
  createdAt: number
}

// A circle on the mind map. Topics are big circles; concepts are small
// circles inside a topic. Removed nodes are kept (removed: true) so the AI
// never adds back something the user deleted.
export interface MindMapNode {
  id: number
  kind: 'topic' | 'concept'
  label: string
  sublabel: string // class name for a topic made from a folder
  folderId: number | null // the folder a topic came from
  parentId: number | null // the topic a concept sits in
  x: number
  y: number
  r: number
  removed: boolean
  createdBy: 'user' | 'ai'
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

// What a content item is: an uploaded PDF, PowerPoint or Word file, pasted
// text, or some other uploaded file whose text can't be read.
export type ContentKind = 'pdf' | 'pptx' | 'docx' | 'text' | 'other'

// A content item in a folder, or a class's syllabus (folderId null).
export interface StoredFile {
  id: number
  classId: number
  folderId: number | null
  isSyllabus: boolean
  kind: ContentKind
  name: string
  mimeType: string
  blob: Blob | null // null for pasted text
  extractedText: string | null // null while the text is still being read
  extractionError: string | null
  partCount: number | null // pages in a PDF, slides in a PowerPoint, paragraphs in Word
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

export interface LessonSection {
  heading: string
  paragraphs: string[]
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
  labels: EntityTable<ClassLabel, 'id'>
  mindMapNodes: EntityTable<MindMapNode, 'id'>
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

// Version 4: content items get a kind, an extraction error and a part count.
export function kindOf(name: string, mimeType: string): ContentKind {
  const lower = name.toLowerCase()
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.pptx')) return 'pptx'
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.txt') || lower.endsWith('.md') || mimeType.startsWith('text/')) return 'text'
  return 'other'
}

db.version(4)
  .stores({})
  .upgrade(async (tx) => {
    await tx
      .table('files')
      .toCollection()
      .modify((f) => {
        f.kind = kindOf(f.name, f.mimeType)
        f.extractionError = null
        f.partCount = null
      })
  })

// Version 5: classes get an order and a label; label and mind map tables.
db.version(5)
  .stores({
    labels: '++id, order',
    mindMapNodes: '++id, kind, folderId, parentId',
  })
  .upgrade(async (tx) => {
    const classes = await tx.table('classes').toArray()
    classes.sort((a, b) => a.createdAt - b.createdAt)
    for (const [i, c] of classes.entries()) {
      await tx.table('classes').update(c.id, { order: i + 1, labelId: null })
    }
  })

// ---------- Ordering ----------

// Swaps a row's order with its neighbour in the given list (already sorted
// by order). direction -1 moves it up, +1 moves it down.
async function swapOrder(
  tableName: 'classes' | 'folders' | 'labels',
  list: { id: number; order: number }[],
  id: number,
  direction: -1 | 1,
) {
  const i = list.findIndex((item) => item.id === id)
  const j = i + direction
  if (i < 0 || j < 0 || j >= list.length) return
  const a = list[i]
  const b = list[j]
  // Equal orders (possible in old data) would not swap, so space them out.
  const aOrder = a.order === b.order ? b.order + direction : b.order
  const table = db.table(tableName)
  await db.transaction('rw', table, async () => {
    await table.update(a.id, { order: aOrder })
    await table.update(b.id, { order: a.order })
  })
}

// ---------- Classes ----------

export async function getClassesInOrder(): Promise<StudyClass[]> {
  return (await db.classes.toArray()).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
}

export async function addClass(name: string): Promise<number> {
  const classes = await getClassesInOrder()
  const order = classes.length ? classes[classes.length - 1].order + 1 : 1
  return db.classes.add({ name, order, labelId: null, createdAt: Date.now() })
}

// Moves a class up or down among the classes with the same label.
export async function moveClass(classId: number, direction: -1 | 1): Promise<void> {
  const all = await getClassesInOrder()
  const current = all.find((c) => c.id === classId)
  if (!current) return
  const group = all.filter((c) => c.labelId === current.labelId)
  await swapOrder('classes', group, classId, direction)
}

export async function setClassLabel(classId: number, labelId: number | null): Promise<void> {
  await db.classes.update(classId, { labelId })
}

// ---------- Labels ----------

export async function getLabelsInOrder(): Promise<ClassLabel[]> {
  return (await db.labels.toArray()).sort((a, b) => a.order - b.order)
}

export async function addLabel(name: string): Promise<number> {
  const labels = await getLabelsInOrder()
  const order = labels.length ? labels[labels.length - 1].order + 1 : 1
  return db.labels.add({ name, order, createdAt: Date.now() })
}

export async function renameLabel(labelId: number, name: string): Promise<void> {
  await db.labels.update(labelId, { name })
}

export async function moveLabel(labelId: number, direction: -1 | 1): Promise<void> {
  await swapOrder('labels', await getLabelsInOrder(), labelId, direction)
}

// Deleting a label keeps its classes; they just lose the label.
export async function deleteLabel(labelId: number): Promise<void> {
  await db.transaction('rw', db.labels, db.classes, async () => {
    await db.classes.filter((c) => c.labelId === labelId).modify({ labelId: null })
    await db.labels.delete(labelId)
  })
}

export async function renameClass(classId: number, name: string): Promise<void> {
  await db.classes.update(classId, { name })
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
  const numbers = folders.map((f) => Number(f.name.match(/^week\s*(\d+)/i)?.[1] ?? 0))
  return Math.max(0, ...numbers) + 1
}

// A folder named "Week 3" is a week; anything else is a topic.
export function folderTypeFromName(name: string): FolderType {
  return /^week\b/i.test(name.trim()) ? 'week' : 'topic'
}

export async function moveFolder(folderId: number, direction: -1 | 1): Promise<void> {
  const folder = await db.folders.get(folderId)
  if (!folder) return
  await swapOrder('folders', await getFoldersForClass(folder.classId), folderId, direction)
}

export async function addFolder(classId: number, name: string): Promise<number> {
  const type = folderTypeFromName(name)
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

export async function renameFolder(folderId: number, name: string): Promise<void> {
  await db.folders.update(folderId, { name, type: folderTypeFromName(name) })
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

// ---------- Content items ----------

function uploadedItem(classId: number, folderId: number | null, file: File) {
  const mimeType = file.type || 'application/octet-stream'
  return {
    classId,
    folderId,
    isSyllabus: folderId === null,
    kind: kindOf(file.name, mimeType),
    name: file.name,
    mimeType,
    blob: file,
    extractedText: null,
    extractionError: null,
    partCount: null,
    createdAt: Date.now(),
  }
}

function pastedItem(classId: number, folderId: number | null, name: string, text: string) {
  return {
    classId,
    folderId,
    isSyllabus: folderId === null,
    kind: 'text' as const,
    name,
    mimeType: 'text/plain',
    blob: null,
    extractedText: text,
    extractionError: null,
    partCount: null,
    createdAt: Date.now(),
  }
}

export async function addFilesToFolder(classId: number, folderId: number, files: File[]) {
  await db.files.bulkAdd(files.map((f) => uploadedItem(classId, folderId, f)))
}

export async function addTextToFolder(classId: number, folderId: number, name: string, text: string) {
  await db.files.add(pastedItem(classId, folderId, name, text))
}

export async function getSyllabus(classId: number): Promise<StoredFile | undefined> {
  return db.files
    .where('classId')
    .equals(classId)
    .filter((f) => f.isSyllabus)
    .first()
}

// A class has one syllabus, so a new one replaces the old one.
async function replaceSyllabus(item: Omit<StoredFile, 'id'>) {
  await db.transaction('rw', db.files, async () => {
    await db.files
      .where('classId')
      .equals(item.classId)
      .filter((f) => f.isSyllabus)
      .delete()
    await db.files.add(item)
  })
}

export async function setSyllabusFile(classId: number, file: File): Promise<void> {
  await replaceSyllabus(uploadedItem(classId, null, file))
}

export async function setSyllabusText(classId: number, name: string, text: string) {
  await replaceSyllabus(pastedItem(classId, null, name, text))
}

export async function deleteFile(fileId: number): Promise<void> {
  await db.files.delete(fileId)
}

// ---------- Flashcards ----------

export async function saveReviewResult(flashcardId: number, correct: boolean): Promise<void> {
  await db.reviewResults.add({ flashcardId, correct, answeredAt: Date.now() })
}

// ---------- Mind map ----------

export async function getMindMapNodes(): Promise<MindMapNode[]> {
  return db.mindMapNodes.filter((n) => !n.removed).toArray()
}

export async function addMindMapNode(
  node: Omit<MindMapNode, 'id' | 'removed' | 'createdAt'>,
): Promise<number> {
  return db.mindMapNodes.add({ ...node, removed: false, createdAt: Date.now() })
}

export async function moveMindMapNodes(positions: { id: number; x: number; y: number }[]) {
  await db.transaction('rw', db.mindMapNodes, async () => {
    for (const p of positions) await db.mindMapNodes.update(p.id, { x: p.x, y: p.y })
  })
}

export async function updateMindMapNode(id: number, changes: Partial<Pick<MindMapNode, 'label' | 'r'>>) {
  await db.mindMapNodes.update(id, changes)
}

// Removing a topic removes its concepts too.
export async function removeMindMapNode(id: number): Promise<void> {
  await db.transaction('rw', db.mindMapNodes, async () => {
    await db.mindMapNodes.update(id, { removed: true })
    await db.mindMapNodes.where('parentId').equals(id).modify({ removed: true })
  })
}
