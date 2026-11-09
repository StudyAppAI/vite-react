import { Link } from 'react-router-dom'
import type { Folder } from '../db.ts'
import FolderBadge from './FolderBadge.tsx'
import { folderTypeLabel } from '../hooks.ts'

interface Props {
  folders: Folder[]
  linkTo: (folder: Folder) => string
}

export default function FolderLinkList({ folders, linkTo }: Props) {
  return (
    <ul className="list">
      {folders.map((f) => (
        <li key={f.id}>
          <Link className="row" to={linkTo(f)}>
            <FolderBadge folder={f} />
            <span className="row-text">
              <span className="row-title">{f.name}</span>
              <span className="row-detail">{folderTypeLabel(f)}</span>
            </span>
            <span className="chevron" aria-hidden="true">›</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
