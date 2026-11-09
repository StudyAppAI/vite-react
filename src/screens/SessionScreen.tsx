import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.tsx'
import FlashcardSession from '../components/FlashcardSession.tsx'

// Shown at /flashcards/session and /classes/:classId/flashcards/session.
// Both use the same FlashcardSession and the same flashcards table.
export default function SessionScreen() {
  const { classId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const folderIds = (params.get('folders') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

  const backTo = classId ? `/classes/${classId}/flashcards` : '/flashcards'

  return (
    <>
      <Header back={{ to: backTo, label: 'Flashcards' }} />
      <FlashcardSession folderIds={folderIds} onDone={() => navigate(backTo)} />
    </>
  )
}
