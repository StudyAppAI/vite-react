import FlashcardPicker from '../components/FlashcardPicker.tsx'
import { useClassContext } from './classContext.ts'

// Class page → Flashcards tab. Same picker as the bottom Flashcards tab.
export default function ClassFlashcardsTab() {
  const { studyClass } = useClassContext()
  return (
    <FlashcardPicker
      key={studyClass.id}
      classId={studyClass.id}
      sessionPath={`/classes/${studyClass.id}/flashcards/session`}
    />
  )
}
