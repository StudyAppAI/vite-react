import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title?: string
  subtitle?: string
  back?: { to: string; label: string }
  right?: ReactNode
}

// iOS-style header: a small bar with a back link and an optional button on
// the right, then a large title.
export default function Header({ title, subtitle, back, right }: Props) {
  return (
    <>
      {(back || right) && (
        <div className="nav-bar">
          {back ? (
            <Link className="nav-button" to={back.to}>
              <span className="back-chevron" aria-hidden="true">
                ‹
              </span>
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          {right}
        </div>
      )}
      {title && (
        <header className={back || right ? 'large-header' : 'large-header top'}>
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </header>
      )}
    </>
  )
}
