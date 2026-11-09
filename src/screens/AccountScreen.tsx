import Header from '../components/Header.tsx'

export default function AccountScreen() {
  return (
    <>
      <Header title="Account" />
      <h2 className="section-header">Settings</h2>
      <ul className="list">
        <li>
          <div className="row">
            <span className="row-title">Account</span>
            <span className="row-detail">Coming soon</span>
          </div>
        </li>
        <li>
          <div className="row">
            <span className="row-title">Settings</span>
            <span className="row-detail">Coming soon</span>
          </div>
        </li>
      </ul>
      <p className="hint-text spaced-text">Your classes and files are saved on this device.</p>
    </>
  )
}
