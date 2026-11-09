import type { Folder } from '../db.ts'
import FolderBadge from './FolderBadge.tsx'

interface Props {
  folders: Folder[]
  cardCounts: Map<number, number>
  selected: Set<number>
  onChange: (selected: Set<number>) => void
  allLabel?: string
}

// A checklist of folders with an "All" row. Folders without flashcards can't
// be picked.
export default function FolderChecklist({
  folders,
  cardCounts,
  selected,
  onChange,
  allLabel = 'All folders',
}: Props) {
  const pickable = folders.filter((f) => (cardCounts.get(f.id) ?? 0) > 0)
  const allChosen = pickable.length > 0 && pickable.every((f) => selected.has(f.id))

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const toggleAll = () => {
    const next = new Set(selected)
    for (const f of pickable) {
      if (allChosen) next.delete(f.id)
      else next.add(f.id)
    }
    onChange(next)
  }

  return (
    <ul className="list">
      <li>
        <button
          className="row"
          onClick={toggleAll}
          disabled={pickable.length === 0}
          aria-pressed={allChosen}
        >
          <span className={`check ${allChosen ? 'on' : ''}`} aria-hidden="true" />
          <span className="row-title strong">{allLabel}</span>
        </button>
      </li>
      {folders.map((f) => {
        const count = cardCounts.get(f.id) ?? 0
        const on = selected.has(f.id)
        return (
          <li key={f.id}>
            <button
              className="row"
              onClick={() => toggle(f.id)}
              disabled={count === 0}
              aria-pressed={on}
            >
              <span className={`check ${on ? 'on' : ''}`} aria-hidden="true" />
              <FolderBadge folder={f} />
              <span className="row-title">{f.name}</span>
              <span className="row-detail">
                {count === 0 ? 'No cards' : `${count} ${count === 1 ? 'card' : 'cards'}`}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
