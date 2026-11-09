import { useEffect, useState } from 'react'
import { db, saveReviewResult, type Flashcard } from '../db.ts'
import { explainCard } from '../ai/actions.ts'

interface Props {
  folderIds: number[]
  onDone: () => void
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// The one flashcard session. Both /classes/:classId/review/session and
// /review/session show this, reading cards straight from the flashcards table.
export default function FlashcardSession({ folderIds, onDone }: Props) {
  const [cards, setCards] = useState<Flashcard[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [missedCurrent, setMissedCurrent] = useState(false)
  const [results, setResults] = useState<Map<number, boolean>>(new Map())
  const [finished, setFinished] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const folderKey = folderIds.join(',')

  useEffect(() => {
    let cancelled = false
    const ids = folderKey ? folderKey.split(',').map(Number) : []
    db.flashcards
      .where('folderId')
      .anyOf(ids)
      .toArray()
      .then((loaded) => {
        if (!cancelled) setCards(shuffle(loaded))
      })
    return () => {
      cancelled = true
    }
  }, [folderKey])

  const start = (deck: Flashcard[]) => {
    setCards(shuffle(deck))
    setIndex(0)
    setRevealed(false)
    setMissedCurrent(false)
    setResults(new Map())
    setFinished(false)
    setShowExplanation(false)
    setExplainError(null)
  }

  if (cards === null) return null

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <p>There are no flashcards in these folders yet.</p>
        <p className="row-detail">
          Open a folder in Course Content and tap “Make flashcards”.
        </p>
      </div>
    )
  }

  if (finished) {
    const missed = cards.filter((c) => results.get(c.id) === false)
    const correct = cards.length - missed.length
    return (
      <div className="results">
        <div className="score-card">
          <p className="score">
            {correct}
            <span> / {cards.length}</span>
          </p>
          <p className="row-detail">
            {missed.length === 0 ? 'You got every card. Nice work!' : 'cards correct'}
          </p>
        </div>

        {missed.length > 0 && (
          <>
            <h2 className="section-header">Missed cards</h2>
            <ul className="list">
              {missed.map((c) => (
                <li key={c.id} className="missed-row">
                  <p className="missed-front">{c.front}</p>
                  <p className="missed-back">{c.back}</p>
                  {c.explanation && <p className="explanation small">{c.explanation}</p>}
                </li>
              ))}
            </ul>
            <button className="primary block spaced" onClick={() => start(missed)}>
              Review missed cards
            </button>
          </>
        )}
        <button
          className={missed.length > 0 ? 'secondary block' : 'primary block spaced'}
          onClick={onDone}
        >
          Done
        </button>
      </div>
    )
  }

  const card = cards[index]

  const next = () => {
    if (index + 1 >= cards.length) {
      setFinished(true)
    } else {
      setIndex(index + 1)
      setRevealed(false)
      setMissedCurrent(false)
      setShowExplanation(false)
      setExplainError(null)
    }
  }

  const answer = async (correct: boolean) => {
    await saveReviewResult(card.id, correct)
    setResults(new Map(results).set(card.id, correct))
    if (correct) next()
    else setMissedCurrent(true)
  }

  const explain = async () => {
    setExplainError(null)
    setShowExplanation(true)
    if (card.explanation) return
    setExplaining(true)
    try {
      const explanation = await explainCard(card.id)
      setCards((prev) =>
        prev ? prev.map((c) => (c.id === card.id ? { ...c, explanation } : c)) : prev,
      )
    } catch (e) {
      setShowExplanation(false)
      setExplainError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div className="session">
      <div className="progress">
        <div className="progress-bar">
          <div style={{ width: `${(index / cards.length) * 100}%` }} />
        </div>
        <span className="row-detail">
          {index + 1} / {cards.length}
        </span>
      </div>

      <button
        className={`flashcard ${revealed ? 'revealed' : ''}`}
        onClick={() => setRevealed(true)}
        disabled={revealed}
        aria-label={revealed ? undefined : 'Show answer'}
      >
        <span className="concept">{card.concept}</span>
        <span className="front">{card.front}</span>
        {revealed ? (
          <>
            <span className="divider" />
            <span className="back">{card.back}</span>
          </>
        ) : (
          <span className="hint">Tap to show answer</span>
        )}
      </button>

      {revealed && !missedCurrent && (
        <div className="answer-buttons">
          <button className="missed" onClick={() => answer(false)}>
            Missed it
          </button>
          <button className="got" onClick={() => answer(true)}>
            Got it
          </button>
        </div>
      )}

      {missedCurrent && (
        <div className="after-miss">
          {showExplanation && (
            <div className="explanation">
              {explaining ? <p className="row-detail">Writing an explanation…</p> : card.explanation}
            </div>
          )}
          {explainError && <p className="error">{explainError}</p>}
          <div className="answer-buttons">
            {!showExplanation && (
              <button className="secondary" onClick={explain}>
                Explain this
              </button>
            )}
            <button className="primary" onClick={next} disabled={explaining}>
              {index + 1 >= cards.length ? 'See results' : 'Next card'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
