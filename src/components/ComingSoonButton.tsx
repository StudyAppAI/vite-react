import { showToast } from '../toast.ts'

interface Props {
  label: string
  className?: string
}

// A button for a feature that isn't built yet. It sits in its final place,
// greyed out, with "Coming soon" under the label. Tapping it only shows a
// short "Coming soon" message.
export default function ComingSoonButton({ label, className = '' }: Props) {
  return (
    <button
      type="button"
      className={`coming-soon ${className}`}
      aria-disabled="true"
      onClick={() => showToast(`${label}: coming soon`)}
    >
      <span className="coming-soon-label">{label}</span>
      <span className="coming-soon-note">Coming soon</span>
    </button>
  )
}
