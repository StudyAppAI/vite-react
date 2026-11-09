import Header from '../components/Header.tsx'
import FlashcardPicker from '../components/FlashcardPicker.tsx'

// Bottom Flashcards tab: pick classes, then folders, then start.
export default function FlashcardsScreen() {
  return (
    <>
      <Header title="Flashcards" subtitle="Study cards from any of your classes." />
      <FlashcardPicker sessionPath="/flashcards/session" />
    </>
  )
}
