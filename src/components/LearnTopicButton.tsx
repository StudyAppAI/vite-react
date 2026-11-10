import { useState } from 'react'
import Sheet from './Sheet.tsx'
import ComingSoonButton from './ComingSoonButton.tsx'

// "Learn a new topic": for when there is no course material. The user types
// a topic; generating folders, content and flashcards for it is not built
// yet, so that button is marked Coming soon.
export default function LearnTopicButton({ className = 'secondary block' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Learn a new topic
      </button>
      {open && (
        <Sheet title="Learn a new topic" onClose={() => setOpen(false)}>
          <div className="sheet-body">
            <label className="field-label" htmlFor="topic-field">
              What do you want to learn?
            </label>
            <input
              id="topic-field"
              className="text-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Linear algebra, Photosynthesis"
              autoComplete="off"
              autoFocus
            />
            <p className="hint-text">
              The app will build a folder for the topic, split it into smaller folders in teaching
              order, and write the content and flashcards for each one.
            </p>
            <ComingSoonButton label="Generate folders, content and flashcards" className="block" />
          </div>
        </Sheet>
      )}
    </>
  )
}
