import { useEffect, useState } from 'react'
import HomeScreen from './screens/HomeScreen.tsx'
import ClassScreen from './screens/ClassScreen.tsx'

// The open class is kept in the URL hash (#/class/3) so a reload stays on it.
function readClassId(): number | null {
  const match = window.location.hash.match(/^#\/class\/(\d+)$/)
  return match ? Number(match[1]) : null
}

export default function App() {
  const [classId, setClassId] = useState<number | null>(readClassId)

  useEffect(() => {
    const onHashChange = () => setClassId(readClassId())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const openClass = (id: number) => {
    window.location.hash = `/class/${id}`
  }

  const goHome = () => {
    if (window.history.length > 1 && readClassId() !== null) {
      window.history.back()
    } else {
      window.location.hash = ''
    }
  }

  return classId === null ? (
    <HomeScreen onOpenClass={openClass} />
  ) : (
    <ClassScreen classId={classId} onBack={goHome} />
  )
}
