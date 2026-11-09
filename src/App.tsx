import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import HomeScreen from './screens/HomeScreen.tsx'
import ClassesScreen from './screens/ClassesScreen.tsx'
import ClassScreen from './screens/ClassScreen.tsx'
import ContentScreen from './screens/ContentScreen.tsx'
import FolderScreen from './screens/FolderScreen.tsx'
import ClassReviewScreen from './screens/ClassReviewScreen.tsx'
import ReviewScreen from './screens/ReviewScreen.tsx'
import SessionScreen from './screens/SessionScreen.tsx'
import FolderLessonListScreen from './screens/FolderLessonListScreen.tsx'
import LearnScreen from './screens/LearnScreen.tsx'
import LessonScreen from './screens/LessonScreen.tsx'
import AccountScreen from './screens/AccountScreen.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomeScreen />} />

          <Route path="classes" element={<ClassesScreen />} />
          <Route path="classes/:classId" element={<ClassScreen />} />
          <Route path="classes/:classId/content" element={<ContentScreen />} />
          <Route path="classes/:classId/content/:folderId" element={<FolderScreen />} />
          <Route path="classes/:classId/review" element={<ClassReviewScreen />} />
          <Route path="classes/:classId/review/session" element={<SessionScreen />} />
          <Route path="classes/:classId/learn" element={<FolderLessonListScreen from="class" />} />
          <Route path="classes/:classId/learn/:folderId" element={<LessonScreen from="class" />} />

          <Route path="review" element={<ReviewScreen />} />
          <Route path="review/session" element={<SessionScreen />} />

          <Route path="learn" element={<LearnScreen />} />
          <Route path="learn/:classId" element={<FolderLessonListScreen from="learn" />} />
          <Route path="learn/:classId/:folderId" element={<LessonScreen from="learn" />} />

          <Route path="account" element={<AccountScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
