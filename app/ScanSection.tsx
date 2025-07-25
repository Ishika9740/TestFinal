import { useAppContext } from './AppContext'

export default function ScanSection({ setMode }: { setMode: (mode: string) => void }) {
  const { setScannedText, setFlashcards, setQuizzes } = useAppContext()

  // Example functions to generate flashcards and quizzes from text
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

  // Example: handle OCR result
  const handleScanResult = (text: string) => {
    setScannedText(text)
    // Optionally generate flashcards and quizzes from text
    setFlashcards(generateFlashcards(text))
    setQuizzes(generateQuizzes(text))
    setMode('flashcards') // or whatever mode you want to switch to
  }

  // ...render scan UI and call handleScanResult when scan is done...

  return (
    <div>
      {/* Your scan UI here */}
      {/* Example button to simulate scan */}
      <button
        onClick={() => handleScanResult('Example scanned text')}
        className="bg-green-700 text-white px-6 py-2 rounded-xl"
      >
        Simulate Scan
      </button>
    </div>
  )
}