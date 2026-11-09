import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Header from '../components/Header.tsx'
import { db } from '../db.ts'
import { formatSize, plural } from '../hooks.ts'

export default function AccountScreen() {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const stats = useLiveQuery(async () => {
    let bytes = 0
    await db.files.each((f) => (bytes += f.blob.size))
    return {
      classes: await db.classes.count(),
      files: await db.files.count(),
      cards: await db.flashcards.count(),
      bytes,
    }
  })

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false))
  }, [])

  return (
    <>
      <Header title="Account" />

      <h2 className="section-header">Account</h2>
      <div className="action-card">
        <p>Sign in to back up your classes and use them on other devices.</p>
        <button className="primary block" disabled>
          Sign in · coming soon
        </button>
      </div>

      <h2 className="section-header">On this device</h2>
      <ul className="list">
        <li>
          <div className="row">
            <span className="row-title">Classes</span>
            <span className="row-detail">{stats ? plural(stats.classes, 'class', 'classes') : ''}</span>
          </div>
        </li>
        <li>
          <div className="row">
            <span className="row-title">Uploaded files</span>
            <span className="row-detail">
              {stats ? `${plural(stats.files, 'file')} · ${formatSize(stats.bytes)}` : ''}
            </span>
          </div>
        </li>
        <li>
          <div className="row">
            <span className="row-title">Flashcards</span>
            <span className="row-detail">{stats ? plural(stats.cards, 'card') : ''}</span>
          </div>
        </li>
        <li>
          <div className="row">
            <span className="row-title">Protected from clean-up</span>
            <span className="row-detail">
              {persisted === null ? '' : persisted ? 'Yes' : 'Not yet'}
            </span>
          </div>
        </li>
      </ul>

      <h2 className="section-header">Settings</h2>
      <p className="hint-text">Settings will appear here.</p>
    </>
  )
}
