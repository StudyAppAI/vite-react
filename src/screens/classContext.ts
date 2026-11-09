import { useOutletContext } from 'react-router-dom'
import type { StudyClass } from '../db.ts'

export interface ClassContext {
  studyClass: StudyClass
  editing: boolean
}

// Lets the class page's tabs read the class and whether Edit is on.
export function useClassContext() {
  return useOutletContext<ClassContext>()
}
