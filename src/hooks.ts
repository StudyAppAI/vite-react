import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getClassesInOrder, getFoldersForClass, type Folder } from './db.ts'

export function useIdParam(name: string): number {
  return Number(useParams()[name])
}

// null while loading, undefined when the class doesn't exist.
export function useClass(classId: number) {
  return useLiveQuery(() => db.classes.get(classId), [classId], null)
}

export function useFolders(classId: number) {
  return useLiveQuery(() => getFoldersForClass(classId), [classId])
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function folderTypeLabel(folder: Folder): string {
  return folder.type === 'week' ? 'Week' : 'Topic'
}

export function useClassesInOrder() {
  return useLiveQuery(getClassesInOrder)
}
