import type { Folder } from '../db.ts'

// A week shows its number (Week 3 → "3"); a topic shows its first letter.
export default function FolderBadge({ folder }: { folder: Folder }) {
  const number = folder.name.match(/\d+/)?.[0]
  const text =
    folder.type === 'week' ? (number ?? 'W') : (folder.name.trim()[0] ?? 'T').toUpperCase()
  return <span className={`badge ${folder.type}`}>{text}</span>
}
