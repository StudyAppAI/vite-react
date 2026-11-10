import { useState } from 'react'
import { generateForFolders, type GenerateKind } from '../ai/actions.ts'
import { plural } from '../hooks.ts'
import { useOnline } from '../useOnline.ts'

interface Props {
  kind: GenerateKind
  // Folders that have content but no deck (flashcards) or no lesson (lesson).
  folderIds: number[]
  // Shown when there is nothing left to generate.
  allDoneText: string
}

// "Generate flashcards for 3 folders" / "Generate lessons for 3 folders".
export default function BulkGenerateButton({ kind, folderIds, allDoneText }: Props) {
  const online = useOnline()
  const [running, setRunning] = useState<{ finished: number; total: number } | null>(null)
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null)

  const count = folderIds.length
  const label =
    kind === 'flashcards'
      ? `Generate flashcards for ${plural(count, 'folder')}`
      : `Generate lessons for ${plural(count, 'folder')}`

  const run = async () => {
    const ids = [...folderIds]
    setResult(null)
    setRunning({ finished: 0, total: ids.length })
    const outcome = await generateForFolders(ids, kind, (finished) =>
      setRunning({ finished, total: ids.length }),
    )
    setRunning(null)
    const made = kind === 'flashcards' ? 'Made flashcards for' : 'Made lessons for'
    const failures = outcome.failed.map((f) => `${f.folderName}: ${f.message}`).join(' ')
    setResult({
      text: outcome.failed.length
        ? `${outcome.done ? `${made} ${plural(outcome.done, 'folder')}. ` : ''}${failures}`
        : `${made} ${plural(outcome.done, 'folder')}.`,
      error: outcome.failed.length > 0,
    })
  }

  if (count === 0 && !running && !result) return <p className="notice-text">{allDoneText}</p>

  return (
    <div className="generate bulk">
      {(count > 0 || running) && (
        <button
          type="button"
          className={`generate-button ${kind}`}
          disabled={running !== null || !online}
          onClick={run}
        >
          {running && <span className="spinner" aria-hidden="true" />}
          {running ? `Generating ${Math.min(running.finished + 1, running.total)} of ${running.total}…` : label}
        </button>
      )}
      {!online && !running && count > 0 && <p className="generate-note">Needs internet</p>}
      {running && <p className="generate-note">Each folder can take a minute or two.</p>}
      {result && !running && (
        <p className={`generate-note ${result.error ? 'error-text' : 'success-text'}`} role="status">
          {result.text}
        </p>
      )}
    </div>
  )
}
