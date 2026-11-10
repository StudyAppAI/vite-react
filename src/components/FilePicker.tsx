import { useRef, type ReactNode } from 'react'

const ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
].join(',')

interface Props {
  multiple?: boolean
  onFiles: (files: File[]) => void
  className?: string
  children: ReactNode
}

// A button that opens the iPhone file picker for PDF, Word, PowerPoint and text files.
export default function FilePicker({ multiple = false, onFiles, className, children }: Props) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) onFiles(files)
        }}
      />
    </>
  )
}
