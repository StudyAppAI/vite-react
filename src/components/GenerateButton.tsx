import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.ts'
import { generateForFolder, useIsGenerating, type GenerateKind } from '../ai/actions.ts'
import { useOnline } from '../useOnline.ts'

interface Props {
  folderId: number
  kind: GenerateKind
  small?: boolean
}

// The AI button for one folder. "flashcards": Generate flashcards, or Add more
// flashcards once the folder has a deck. "lesson": Generate interactive lesson,
// or Regenerate lesson once it has one. Every copy calls generateForFolder().
export default function GenerateButton({ folderId, kind, small = false }: Props) {
  const online = useOnline()
  const generating = useIsGenerating(folderId, kind)
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null)

  const state = useLiveQuery(
    async () => {
      const items = await db.files.where('folderId').equals(folderId).toArray()
      const exists =
        kind === 'flashcards'
          ? (await db.flashcards.where('folderId').equals(folderId).count()) > 0
          : (await db.lessons.where('folderId').equals(folderId).count()) > 0
      return {
        exists,
        hasText: items.some((i) => i.extractedText),
        reading: items.some((i) => i.extractedText === null && !i.extractionError),
      }
    },
    [folderId, kind],
  )

  if (!state) return null

  const label =
    kind === 'flashcards'
      ? state.exists
        ? 'Add more flashcards'
        : 'Generate flashcards'
      : state.exists
        ? 'Regenerate lesson'
        : 'Generate interactive lesson'

  const busyLabel =
    kind === 'flashcards'
      ? state.exists
        ? 'Adding flashcards…'
        : 'Generating flashcards…'
      : 'Generating lesson…'

  const blocked = !state.hasText
    ? state.reading
      ? 'Reading your files…'
      : 'Add content first'
    : !online
      ? 'Needs internet'
      : null

  const run = async () => {
    if (kind === 'lesson' && state.exists && !window.confirm('Replace this folder’s lesson with a new one?')) {
      return
    }
    setResult(null)
    try {
      setResult({ text: await generateForFolder(folderId, kind), error: false })
    } catch (e) {
      setResult({ text: e instanceof Error ? e.message : 'Something went wrong. Try again.', error: true })
    }
  }

  return (
    <div className={`generate ${small ? 'small' : ''}`}>
      <button
        type="button"
        className={`generate-button ${kind}`}
        disabled={generating || blocked !== null}
        onClick={run}
      >
        {generating && <span className="spinner" aria-hidden="true" />}
        {generating ? busyLabel : label}
      </button>
      {blocked && !generating && <p className="generate-note">{blocked}</p>}
      {generating && <p className="generate-note">This can take a minute or two.</p>}
      {result && !generating && (
        <p className={`generate-note ${result.error ? 'error-text' : 'success-text'}`} role="status">
          {result.text}
        </p>
      )}
    </div>
  )
}
