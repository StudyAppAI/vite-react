// Reads the text out of uploaded files, in the browser, right after upload.
//   PDF: pdf.js, page by page ("--- Page 3 ---")
//   PowerPoint (.pptx): unzip with JSZip, read each slide's XML ("--- Slide 3 ---")
//   Word (.docx): unzip with JSZip, read the document's paragraphs
//   Plain text (.txt, .md): read as is
// The result is saved on the content item as extractedText.

import { db, type ContentKind } from './db.ts'

export interface Extracted {
  text: string
  partCount: number
}

const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

async function extractPdf(blob: Blob): Promise<Extracted> {
  // Loaded only when a PDF is uploaded. The legacy build supports older iPhones.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
  } catch (e) {
    if (e instanceof Error && e.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Remove the password and upload it again.')
    }
    throw new Error('This file couldn’t be opened as a PDF.')
  }
  const pages: string[] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ')
    }
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (text) pages.push(`--- Page ${n} ---\n${text}`)
  }
  await pdf.destroy()

  if (pages.length === 0) {
    throw new Error('This PDF has no readable text. It may be scanned images.')
  }
  return { text: pages.join('\n\n'), partCount: pdf.numPages }
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

// Slide file paths in the order they appear in the presentation.
async function slidePaths(zip: import('jszip')): Promise<string[]> {
  const byName = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))

  const presentation = await zip.file('ppt/presentation.xml')?.async('string')
  const rels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string')
  if (!presentation || !rels) return byName

  const targets = new Map<string, string>()
  for (const rel of Array.from(parseXml(rels).getElementsByTagName('Relationship'))) {
    const target = rel.getAttribute('Target') ?? ''
    targets.set(rel.getAttribute('Id') ?? '', target.startsWith('/') ? target.slice(1) : `ppt/${target}`)
  }
  const ordered = Array.from(parseXml(presentation).getElementsByTagName('p:sldId'))
    .map((el) => targets.get(el.getAttributeNS(REL_NS, 'id') ?? '') ?? '')
    .filter((p) => zip.file(p))
  return ordered.length > 0 ? ordered : byName
}

async function extractPptx(blob: Blob): Promise<Extracted> {
  const JSZip = (await import('jszip')).default
  let zip: import('jszip')
  try {
    zip = await JSZip.loadAsync(blob)
  } catch {
    throw new Error('This file couldn’t be opened as a PowerPoint (.pptx).')
  }

  const paths = await slidePaths(zip)
  if (paths.length === 0) throw new Error('No slides were found in this PowerPoint.')

  const slides: string[] = []
  let anyText = false
  for (const [i, path] of paths.entries()) {
    const xml = await zip.file(path)!.async('string')
    const lines = Array.from(parseXml(xml).getElementsByTagNameNS(DRAWING_NS, 'p'))
      .map((p) =>
        Array.from(p.getElementsByTagNameNS(DRAWING_NS, 't'))
          .map((t) => t.textContent ?? '')
          .join('')
          .trim(),
      )
      .filter(Boolean)
    if (lines.length > 0) anyText = true
    slides.push(`--- Slide ${i + 1} ---\n${lines.join('\n')}`)
  }

  if (!anyText) {
    throw new Error('This PowerPoint has no readable text on its slides.')
  }
  return { text: slides.join('\n\n'), partCount: paths.length }
}

async function extractDocx(blob: Blob): Promise<Extracted> {
  const JSZip = (await import('jszip')).default
  let xml: string | undefined
  try {
    xml = await (await JSZip.loadAsync(blob)).file('word/document.xml')?.async('string')
  } catch {
    xml = undefined
  }
  if (!xml) throw new Error('This file couldn’t be opened as a Word document (.docx).')

  const paragraphs = Array.from(parseXml(xml).getElementsByTagNameNS(WORD_NS, 'p'))
    .map((p) =>
      Array.from(p.getElementsByTagNameNS(WORD_NS, 't'))
        .map((t) => t.textContent ?? '')
        .join('')
        .trim(),
    )
    .filter(Boolean)
  if (paragraphs.length === 0) throw new Error('This Word document has no readable text.')
  return { text: paragraphs.join('\n'), partCount: paragraphs.length }
}

async function extractPlainText(blob: Blob): Promise<Extracted> {
  const text = (await blob.text()).trim()
  if (!text) throw new Error('This file is empty.')
  return { text, partCount: 0 }
}

export async function extractText(kind: ContentKind, blob: Blob, name: string): Promise<Extracted> {
  if (kind === 'pdf') return extractPdf(blob)
  if (kind === 'pptx') return extractPptx(blob)
  if (kind === 'docx') return extractDocx(blob)
  if (kind === 'text') return extractPlainText(blob)
  const lower = name.toLowerCase()
  if (lower.endsWith('.doc')) {
    throw new Error('Old Word files (.doc) can’t be read. Save it as .docx or PDF and upload it again.')
  }
  if (lower.endsWith('.ppt')) {
    throw new Error('Old PowerPoint files (.ppt) can’t be read. Save it as .pptx or PDF and upload it again.')
  }
  throw new Error('This file type can’t be read. Upload a PDF, Word or PowerPoint file.')
}

// Reads every content item that doesn't have its text yet. Runs after each
// upload and when the app starts, so an upload interrupted by closing the
// app is finished next time.
let running = false
let again = false

export async function readPendingFiles(): Promise<void> {
  if (running) {
    again = true
    return
  }
  running = true
  try {
    do {
      again = false
      const pending = await db.files
        .filter((f) => f.extractedText === null && !f.extractionError)
        .toArray()
      for (const item of pending) {
        try {
          if (!item.blob) throw new Error('This item has no file to read.')
          const { text, partCount } = await extractText(item.kind, item.blob, item.name)
          await db.files.update(item.id, { extractedText: text, partCount, extractionError: null })
        } catch (e) {
          const message = e instanceof Error ? e.message : 'The text couldn’t be read.'
          await db.files.update(item.id, { extractionError: message })
        }
      }
    } while (again)
  } finally {
    running = false
  }
}
