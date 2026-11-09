import type { ReactNode } from 'react'

export interface ChecklistItem {
  id: number
  label: string
  icon?: ReactNode
  detail?: string
}

interface Props {
  items: ChecklistItem[]
  selected: Set<number>
  onChange: (selected: Set<number>) => void
  allLabel: string
}

// A list of tickable rows with an "All" row on top. Used for picking classes
// and folders on both Review pages.
export default function Checklist({ items, selected, onChange, allLabel }: Props) {
  const allChosen = items.length > 0 && items.every((i) => selected.has(i.id))

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const toggleAll = () => {
    const next = new Set(selected)
    for (const i of items) {
      if (allChosen) next.delete(i.id)
      else next.add(i.id)
    }
    onChange(next)
  }

  return (
    <ul className="list">
      <li>
        <button className="row" onClick={toggleAll} aria-pressed={allChosen}>
          <span className={`check ${allChosen ? 'on' : ''}`} aria-hidden="true" />
          <span className="row-title strong">{allLabel}</span>
        </button>
      </li>
      {items.map((i) => {
        const on = selected.has(i.id)
        return (
          <li key={i.id}>
            <button className="row" onClick={() => toggle(i.id)} aria-pressed={on}>
              <span className={`check ${on ? 'on' : ''}`} aria-hidden="true" />
              {i.icon}
              <span className="row-title">{i.label}</span>
              {i.detail && <span className="row-detail">{i.detail}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
