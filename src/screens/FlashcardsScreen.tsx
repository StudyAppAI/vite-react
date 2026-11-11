import Header from '../components/Header.tsx'
import FlashcardPicker from '../components/FlashcardPicker.tsx'
import StudySets from '../components/StudySets.tsx'

// Bottom Flashcards tab: the user's own sets, then pick classes and folders.
export default function FlashcardsScreen() {
  return (
    <>
      <Header title="Flashcards" subtitle="Study cards from any of your classes." />
      <StudySets />
      <h2 className="section-header">Or choose folders</h2>
      <FlashcardPicker sessionPath="/flashcards/session" />
    </>
  )
}
