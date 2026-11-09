import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { readPendingFiles } from './extract.ts'
import './index.css'

// Ask the browser not to clear on-device data when storage runs low.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {})
}

// Finish reading any uploads that weren't read yet (for example, the app was
// closed during an upload).
readPendingFiles()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
