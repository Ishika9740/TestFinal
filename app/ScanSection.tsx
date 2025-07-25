import { useAppContext } from './AppContext'
import type { Dispatch, SetStateAction } from 'react'

type Mode = 'home' | 'scan' | 'flashcards' | 'quiz'
export default function ScanSection({ setMode }: { setMode: Dispatch<SetStateAction<Mode>> }) {
  const { setScannedText, setFlashcards, setQuizzes } = useAppContext()

  function generateFlashcards(text: string) {
    return text
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => ({
        question: `What is "${line.split(' ')[0]}"?`,
        answer: line,
      }))
  }

  function generateQuizzes(text: string) {
    return text
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => ({
        question: `What is "${line.split(' ')[0]}"?`,
        options: [line.split(' ')[0], 'Option B', 'Option C', 'Option D'],
        answer: line.split(' ')[0],
      }))
  }

  const handleScanResult = (text: string) => {
    setScannedText(text)
    setFlashcards(generateFlashcards(text))
    setQuizzes(generateQuizzes(text))
    setMode('flashcards')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Scan Camera Button */}
      <button
        onClick={() => handleScanResult('Example scanned text')}
        className="bg-green-700 text-white px-6 py-2 rounded-xl mb-2"
      >
        Scan Camera
      </button>
      {/* Back Button */}
      <button
        onClick={() => setMode('home')}
        className="bg-gray-400 text-white px-6 py-2 rounded-xl"
      >
        Back
      </button>
    </div>
  )
}