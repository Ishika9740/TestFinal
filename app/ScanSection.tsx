import { useAppContext } from './AppContext'

export default function ScanSection({ setMode }: { setMode: (mode: string) => void }) {
  const { setScannedText, setFlashcards, setQuizzes } = useAppContext()
  // ...local state and logic (camera, OCR, etc)...
  // Use context setters for scannedText, flashcards, quizzes
  // Render scan UI as before
}