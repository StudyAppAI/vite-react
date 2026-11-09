import Header from '../components/Header.tsx'
import ComingSoonButton from '../components/ComingSoonButton.tsx'
import { signOut, useAuth } from '../auth.ts'

export default function AccountScreen() {
  const { name } = useAuth()

  const confirmSignOut = () => {
    if (
      window.confirm(
        'Sign out? Your classes and files stay on this device. You’ll need your access code to create your account again.',
      )
    ) {
      signOut()
    }
  }

  return (
    <>
      <Header title="Account" />
      <div className="profile-card">
        <span className="avatar" aria-hidden="true">
          {name.trim()[0]?.toUpperCase() ?? '?'}
        </span>
        <span className="profile-name">{name}</span>
      </div>
      <div className="button-stack">
        <ComingSoonButton label="Back up to cloud" className="block" />
        <ComingSoonButton label="App settings" className="block" />
        <button className="danger block" onClick={confirmSignOut}>
          Sign out
        </button>
      </div>
    </>
  )
}
