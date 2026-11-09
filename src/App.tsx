import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.ts'
import Layout from './components/Layout.tsx'
import CreateAccountScreen from './screens/CreateAccountScreen.tsx'
import HomeScreen from './screens/HomeScreen.tsx'
import ClassesScreen from './screens/ClassesScreen.tsx'
import ClassLayout from './screens/ClassLayout.tsx'
import ContentTab from './screens/ContentTab.tsx'
import ClassFlashcardsTab from './screens/ClassFlashcardsTab.tsx'
import ClassLearnTab from './screens/ClassLearnTab.tsx'
import FolderScreen from './screens/FolderScreen.tsx'
import SessionScreen from './screens/SessionScreen.tsx'
import FlashcardsScreen from './screens/FlashcardsScreen.tsx'
import LearnScreen from './screens/LearnScreen.tsx'
import LearnClassScreen from './screens/LearnClassScreen.tsx'
import LessonScreen from './screens/LessonScreen.tsx'
import AccountScreen from './screens/AccountScreen.tsx'

export default function App() {
  const { token } = useAuth()

  // No saved token: ask for name and access code. With a token the app never
  // checks the server on launch, so it opens offline.
  if (!token) return <CreateAccountScreen />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomeScreen />} />

          <Route path="classes" element={<ClassesScreen />} />
          <Route path="classes/:classId" element={<ClassLayout />}>
            <Route index element={<Navigate to="content" replace />} />
            <Route path="content" element={<ContentTab />} />
            <Route path="flashcards" element={<ClassFlashcardsTab />} />
            <Route path="learn" element={<ClassLearnTab />} />
          </Route>
          <Route path="classes/:classId/content/:folderId" element={<FolderScreen />} />
          <Route path="classes/:classId/flashcards/session" element={<SessionScreen />} />
          <Route path="classes/:classId/learn/:folderId" element={<LessonScreen />} />

          <Route path="flashcards" element={<FlashcardsScreen />} />
          <Route path="flashcards/session" element={<SessionScreen />} />

          <Route path="learn" element={<LearnScreen />} />
          <Route path="learn/:classId" element={<LearnClassScreen />} />
          <Route path="learn/:classId/:folderId" element={<LessonScreen />} />

          <Route path="account" element={<AccountScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
