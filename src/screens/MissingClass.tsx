import Header from '../components/Header.tsx'

export default function MissingClass() {
  return (
    <>
      <Header back={{ to: '/classes', label: 'Classes' }} title="Not found" />
      <p className="empty">This class no longer exists.</p>
    </>
  )
}
