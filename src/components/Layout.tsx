import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from './TabBar.tsx'
import { useToast } from '../toast.ts'

export default function Layout() {
  const { pathname } = useLocation()
  const toast = useToast()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <main className="screen">
        <Outlet />
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <TabBar />
    </>
  )
}
