import type { StoredFile } from '../db.ts'
import { formatSize } from '../hooks.ts'

interface Props {
  file: StoredFile
  onDelete?: () => void
}

function extension(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return (ext || 'file').slice(0, 4).toUpperCase()
}

export default function FileRow({ file, onDelete }: Props) {
  return (
    <div className="row">
      <span className="file-badge">{extension(file.name)}</span>
      <span className="row-text">
        <span className="row-title">{file.name}</span>
        <span className="row-detail">
          {formatSize(file.blob.size)} · added {new Date(file.createdAt).toLocaleDateString()}
        </span>
      </span>
      {onDelete && (
        <button className="delete-button" onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  )
}
