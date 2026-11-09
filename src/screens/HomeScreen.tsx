import { Link } from 'react-router-dom'
import Header from '../components/Header.tsx'

export default function HomeScreen() {
  return (
    <>
      <Header title="Welcome" subtitle="Study App keeps your classes and course files on this device." />
      <div className="welcome-card">
        <p>Start by adding a class, then upload its syllabus and add a folder for each week or topic.</p>
        <Link className="primary block link-button" to="/classes">
          Go to Classes
        </Link>
      </div>
    </>
  )
}
