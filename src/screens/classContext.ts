import { useOutletContext } from 'react-router-dom'
import type { StudyClass } from '../db.ts'

export interface ClassContext {
  studyClass: StudyClass
}

// Lets the class page's tabs read the class.
export function useClassContext() {
  return useOutletContext<ClassContext>()
}
