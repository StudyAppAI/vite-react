import { Link } from 'react-router-dom'
import Header from '../components/Header.tsx'
import ComingSoonButton from '../components/ComingSoonButton.tsx'
import { useAuth } from '../auth.ts'

export default function HomeScreen() {
  const { name } = useAuth()
  return (
    <>
      <Header title={`Welcome, ${name}`} subtitle="Your classes, flashcards and lessons, on this device." />
      <div className="button-stack">
        <Link className="primary block" to="/mindmap">
          Open mind map
        </Link>
        <ComingSoonButton label="Continue where you left off" className="block" />
        <ComingSoonButton label="Cards due for review" className="block" />
      </div>
    </>
  )
}
