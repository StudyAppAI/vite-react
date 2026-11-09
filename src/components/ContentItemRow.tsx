import type { StoredFile } from '../db.ts'
import { formatSize, plural } from '../hooks.ts'

interface Props {
  item: StoredFile
  onDelete: () => void
}

const badge: Record<StoredFile['kind'], string> = {
  pdf: 'PDF',
  pptx: 'PPTX',
  text: 'TEXT',
  other: 'FILE',
}

function details(item: StoredFile): string {
  if (item.kind === 'text') {
    const words = item.extractedText?.split(/\s+/).filter(Boolean).length ?? 0
    return `Pasted text · ${plural(words, 'word')}`
  }
  const size = item.blob ? formatSize(item.blob.size) : ''
  if (item.extractedText === null) return `${size} · Reading text…`
  if (item.kind === 'pdf' && item.partCount) return `${size} · ${plural(item.partCount, 'page')}`
  if (item.kind === 'pptx' && item.partCount) return `${size} · ${plural(item.partCount, 'slide')}`
  return size
}

// One content item: its name, what it is, any reading error, and Delete.
export default function ContentItemRow({ item, onDelete }: Props) {
  return (
    <div className="row content-row">
      <span className={`file-badge ${item.kind}`}>{badge[item.kind]}</span>
      <span className="row-text">
        <span className="row-title">{item.name}</span>
        {item.extractionError ? (
          <span className="row-error">{item.extractionError}</span>
        ) : (
          <span className="row-detail">{details(item)}</span>
        )}
      </span>
      <button type="button" className="delete-button" onClick={onDelete}>
        Delete
      </button>
    </div>
  )
}
