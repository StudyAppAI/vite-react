import { useState } from 'react'
import Sheet from './Sheet.tsx'
import ComingSoonButton from './ComingSoonButton.tsx'

// "Learn a new topic": for when there is no course material. The user
// describes what they want to learn; generating the folders, content and
// flashcards from it is not built yet, so that button is marked Coming soon.
export default function LearnTopicButton({ className = 'secondary block' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [syllabus, setSyllabus] = useState('')
  const [topics, setTopics] = useState('')

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Learn a new topic
      </button>
      {open && (
        <Sheet title="Learn a new topic" onClose={() => setOpen(false)}>
          <div className="sheet-body sheet-scroll">
            <label className="field-label" htmlFor="topic-name">
              Topic name
            </label>
            <input
              id="topic-name"
              className="text-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Linear algebra"
              autoComplete="off"
              autoFocus
            />

            <label className="field-label" htmlFor="topic-syllabus">
              Rough syllabus (optional)
            </label>
            <textarea
              id="topic-syllabus"
              className="text-area short"
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="Paste or type a course outline if you have one"
            />

            <label className="field-label" htmlFor="topic-list">
              Topics you want covered (optional)
            </label>
            <textarea
              id="topic-list"
              className="text-area short"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="e.g. vectors, matrices, determinants, eigenvalues"
            />

            <p className="hint-text">
              The app will build a folder for the topic, split it into smaller folders in teaching order, and
              write the content and flashcards for each one.
            </p>
            <ComingSoonButton label="Generate folders, content and flashcards" className="block" />
          </div>
        </Sheet>
      )}
    </>
  )
}
