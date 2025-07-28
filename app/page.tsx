'use client'
import React, { useState, useRef, useEffect } from 'react'
import Tesseract from 'tesseract.js'
import ScanSection from './ScanSection'
import { useAppContext } from './AppContext'
import { fetchDefinition } from "../lib/dictionary"; // You'll create this file
import { getSynonyms } from "../lib/datamuse"; 
//import type { Dispatch, SetStateAction } from 'react'
//import type { Mode } from "./page"

type Mode = 'home' | 'scan' | 'flashcards' | 'quiz'


//type Flashcard = {
  //question: string
  //answer: string
//}


type Quiz = {
  question: string
  options: string[]
  answer: string
}

const QUESTIONS_PER_SET = 5

function HomePage() {
  const [ocrText, setOcrText] = useState("");
  const [flashcards] = useState<any[]>([]);
  const [mode, setMode] = useState<Mode>('home')
  const [quizzes, setQuizzesState] = useState<Quiz[]>([])
  //const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizCount] = useState(10)
  const [quizSetIndex] = useState(0)
  const [currentQuiz, setCurrentQuiz] = useState(0)
  const [quizFeedback, setQuizFeedback] = useState<{
    correct: boolean
    selected: string
    answer: string
  } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [cameraLoaded, setCameraLoaded] = useState(false)
  const [cameraTimeout, setCameraTimeout] = useState(false)
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [localScannedText, setLocalScannedText] = useState<string | null>(null)
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  //const [dictatedText, setDictatedText] = useState<string>('');
  const [timedOut, setTimedOut] = useState(false)

  const { setFlashcards, setQuizzes, setScannedText } = useAppContext();

  const handleVideoCanPlay = () => {
    setCameraLoaded(true)
  }
// Removed duplicate handleImageUpload to fix redeclaration error

// Remove duplicate generateQuizzes and shuffle declarations



  // --- Logic ---
  const quizzesToShow = quizzes.slice(0, quizCount)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsOcrLoading(true)
      const img = new window.Image()
      img.onload = () => {
        // Resize image
        const targetWidth = 640
        const scale = targetWidth / img.width
        const targetHeight = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        Tesseract.recognize(dataUrl, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text' && m.progress) setOcrProgress(m.progress)
          }
        }).then(({ data: { text } }) => {
          generateFlashcards(text)
          generateQuizzes(text)
          setScannedText(text)
          setLocalScannedText(text) // <-- Add this line
          setMode('flashcards')
          setOcrProgress(0)
          setIsOcrLoading(false)
        })
      }
      img.src = URL.createObjectURL(file)
    }
  }

  const generateFlashcards = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '')
    const cards = lines.map((line) => {
      // Extract keyword: first capitalized word or first word
      const keywordMatch = line.match(/\b([A-Z][a-zA-Z0-9]*)\b/)
      const keyword = keywordMatch ? keywordMatch[1] : line.split(' ')[0]
      return {
        question: `What is "${keyword}"?`,
        answer: line,
      }
    })
    setFlashcards(cards)
  }

  const generateQuizzes = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const quizzesGenerated = lines.map((line) => {
      // Helper to reword for distractors
      const makeDistractor = (sentence: string) => {
        // Remove first keyword/capitalized word
        const keywordMatch = sentence.match(/\b([A-Z][a-zA-Z0-9]*)\b/)
        if (keywordMatch) {
          // Replace keyword with a generic word
          return sentence.replace(keywordMatch[1], "Something")
        }
        // Shuffle words for another distractor
        const words = sentence.split(' ')
        if (words.length > 3) {
          const shuffled = [...words].sort(() => Math.random() - 0.5)
          return shuffled.join(' ')
        }
        // Add a generic prefix for another distractor
        return "Fact: " + sentence
      }

      // Generate 3 distractors
      const distractors: string[] = []
      while (distractors.length < 3) {
        const distractor = makeDistractor(line)
        // Ensure distractor is not the same as the correct answer or already added
        if (distractor !== line && !distractors.includes(distractor)) {
          distractors.push(distractor)
        }
      }

      const options = shuffle([line, ...distractors])
      return {
        question: `Which is correct about "${line.slice(0, 10)}..."?`,
        options,
        answer: line,
      }
    })
    setQuizzesState(quizzesGenerated)
    setQuizzesState(quizzesGenerated)
  }

  const shuffle = (array: string[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  const handleAnswer = (option: string) => {
    if (quizFeedback || timedOut) return
    const current = quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz]
    const isCorrect = option === current.answer
    setQuizFeedback({ correct: isCorrect, selected: option, answer: current.answer })
    if (isCorrect) setQuizScore((prev: number) => prev + 1)
  }

  const handleQuizNext = () => {
    if (currentQuiz < Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET) - 1) {
      setCurrentQuiz((prev: number) => prev + 1)
      setQuizFeedback(null)
    } else {
      setQuizCompleted(true)
    }
  }

  const handleQuizPrev = () => {
    if (currentQuiz > 0) {
      setCurrentQuiz((prev: number) => prev - 1)
      setQuizFeedback(null)
    }
  }

  const startCamera = async () => {
    setCameraError(null)
    setScanning(true)
    setCameraLoaded(false)
    setCameraTimeout(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraLoaded(true)
      }
      // Set a timeout for camera load
      setTimeout(() => {
        if (!cameraLoaded) setCameraTimeout(true)
      }, 5000)
    } catch {
      setCameraError('Could not access camera.')
      setScanning(false)
    }
  }

  const stopCamera = () => {
    setScanning(false)
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const captureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    // Resize to a smaller width for faster OCR (e.g., 640px wide)
    const targetWidth = 640
    const scale = targetWidth / video.videoWidth
    const targetHeight = Math.round(video.videoHeight * scale)
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
    setOcrProgress(0)
    setScanning(false)
    stopCamera()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setIsOcrLoading(true)
    Tesseract.recognize(dataUrl, 'eng', {
      logger: m => {
        // Only update progress if image is large
        if (m.status === 'recognizing text' && m.progress) setOcrProgress(m.progress)
      }
    }).then(({ data: { text } }) => {
      generateFlashcards(text)
      generateQuizzes(text)
      setScannedText(text)
      setLocalScannedText(text) // <-- Add this line
      setMode('flashcards')
      setOcrProgress(0)
      setIsOcrLoading(false)
    })
  }

  const startCountdown = () => {
    setCountdown(3)
    let count = 3
    const interval = setInterval(() => {
      count -= 1
      if (count > 0) {
        setCountdown(count)
      } else {
        clearInterval(interval)
        setCountdown(null)
        captureAndOcr()
      }
    }, 1000)
  }

  const restartQuiz = () => {
    setCurrentQuiz(0)
    setQuizFeedback(null)
    setQuizScore(0)
    setQuizCompleted(false)
    setTimedOut(false)
  }

  // --- UI Components ---
<div>
  <input
    type="file"
    accept="image/*"
    onChange={handleImageUpload}
    className="mb-4"
  />
  <h2 className="text-xl mt-6">Flashcards</h2>
  {flashcards.map((card, i) => (
    <div key={i}>
      <p><strong>Q:</strong> {card.question}</p>
      <p><strong>A:</strong> {card.answer}</p>
    </div>
  ))}

  <h2 className="text-xl mt-6">Quizzes</h2>
  {quizzes.map((quiz, i) => (
    <div key={i}>
      <p><strong>{quiz.question}</strong></p>
      <ul>
        {quiz.options.map((opt, j) => (
          <li key={j}>{opt}</li>
        ))}
      </ul>
    </div>
  ))}
</div>


  // FlashcardList component (replace your current one)
  function FlashcardList() {
    const { flashcards } = useAppContext();
    if (flashcards.length > 0) {
      return (
        <div className="flex flex-col items-center gap-8">
          <div className="flashcard relative cursor-pointer" tabIndex={0}
            onClick={() => setFlipped((prev) => !prev)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setFlipped((prev) => !prev)
            }}
          >
            <div className={`flashcard-inner${flipped ? ' flipped' : ''}`}>
              <div className="flashcard-front bg-white p-8 rounded-2xl shadow-lg min-w-[300px] min-h-[180px] flex flex-col justify-center items-center">
                <p className="font-semibold text-green-700 text-lg mb-2">Q:</p>
                <p className="text-xl">{flashcards[currentFlashcard].question}</p>
                <div className="mt-4 text-brown-700 text-base">Click to flip</div>
              </div>
              <div className="flashcard-back bg-green-50 p-8 rounded-2xl shadow-lg min-w-[300px] min-h-[180px] flex flex-col justify-center items-center">
                <p className="font-semibold text-brown-700 text-lg mb-2">A:</p>
                <p className="text-xl">{flashcards[currentFlashcard].answer}</p>
                <div className="mt-4 text-green-700 text-base">Click to flip</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6">
            <button
              className="bg-green-700 text-white px-8 py-4 text-xl rounded-2xl font-bold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95"
              onClick={() => setCurrentFlashcard((prev) => prev - 1)}
              disabled={currentFlashcard === 0}
            >
              Previous
            </button>
            <button
              className="bg-green-700 text-white px-8 py-4 text-xl rounded-2xl font-bold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95"
              onClick={() => setCurrentFlashcard((prev) => prev + 1)}
              disabled={currentFlashcard === flashcards.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      )
    }
    return <div className="text-center text-brown-700">No flashcards available.</div>
  }

  // QuizCard component
  function QuizCard() {
    const [selected, setSelected] = useState<string | null>(null)
    const [showAnswer, setShowAnswer] = useState(false)
    const [timeLeft, setTimeLeft] = useState(15) // 15 seconds per question

    useEffect(() => {
      if (showAnswer) return
      setTimeLeft(15)
      setTimedOut(false)
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setTimedOut(true)
            setShowAnswer(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }, [currentQuiz, showAnswer])

    const current = quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz]

    const handleSelect = (option: string) => {
      if (showAnswer || timedOut) return
      setSelected(option)
      handleAnswer(option)
      setShowAnswer(true)
    }

    const handleShowAnswer = () => {
      setShowAnswer(true)
    }

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4">
        <div className="text-lg font-semibold text-green-800">
          {current.question}
        </div>
        <div className="text-right text-red-600 font-bold text-lg">
          Time left: {timeLeft}s
        </div>
        {timedOut && (
          <div className="text-center text-red-600 font-bold mb-2">
            Time is up! The correct answer is shown.
          </div>
        )}
        <div className="flex flex-col gap-4">
          {current.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              className={`px-8 py-4 text-xl rounded-2xl font-bold transition-all duration-200 flex items-center gap-2 justify-between
              ${selected === option ? 'bg-green-700 text-white' : 'bg-gray-100 text-green-700'}
              ${showAnswer && option === current.answer ? 'ring-2 ring-green-700' : ''}
              ${showAnswer && option === selected && option !== current.answer ? 'bg-red-500 text-white' : ''}
              `}
              disabled={showAnswer}
            >
              {option}
              {showAnswer && option === current.answer && (
                <span className="text-green-300" role="img" aria-label="Correct"> ✔️</span>
              )}
              {showAnswer && option === selected && option !== current.answer && (
                <span className="text-red-300" role="img" aria-label="Incorrect"> ❌</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-4 mt-4">
          <button
            onClick={handleQuizPrev}
            className="bg-gray-200 text-gray-700 px-8 py-4 text-xl rounded-2xl font-bold transition-all duration-200 hover:bg-gray-300 flex-1"
            disabled={currentQuiz === 0}
          >
            <span role="img" aria-label="Previous">⬅️</span> Previous
          </button>
          <button
            onClick={showAnswer ? handleQuizNext : handleShowAnswer}
            className="bg-green-700 text-white px-8 py-4 text-xl rounded-2xl font-bold transition-all duration-200 hover:bg-green-800 flex-1"
          >
            {showAnswer ? 'Next Question' : 'Show Answer'}
          </button>
        </div>
      </div>
    )
  }

  // Loader component
  function Loader({ message, progress }: { message: string; progress?: number }) {
    return (
      <div className="w-full max-w-md mx-auto my-4 flex flex-col items-center">
        <div className="text-green-700 font-semibold mb-2">{message}</div>
        {typeof progress === 'number' && (
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-green-700 h-3 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-700 border-solid" />
      </div>
    )
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-white font-sans text-lg flex flex-col items-center justify-center px-2 sm:px-4 md:px-8">
      <h1 className="text-4xl sm:text-5xl font-bold text-green-800 text-center bg-brown-700 py-6 rounded-b-2xl mb-8 w-full max-w-2xl mx-auto">
        Study Smart
      </h1>

      {mode === 'home' && (
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 py-8 bg-white rounded-xl shadow-lg">
          <button
            className="bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 w-full"
            onClick={startCamera}
          >
            Scan with Camera
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="mb-4 px-4 py-2 rounded-xl border border-green-300 shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 w-full"
          />
          <button
            className="bg-white text-green-700 px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-50 hover:scale-105 active:scale-95 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 w-full"
            onClick={() => setMode('home')}
          >
            Back
          </button>
        </div>
      )}

      {mode === 'scan' && (
        <ScanSection setMode={setMode} />
      )}

      {mode === 'flashcards' && (
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 md:px-8">
          <FlashcardList />
        </div>
      )}
      {mode === 'quiz' && (
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 md:px-8">
          {quizCompleted ? (
            <div className="text-center my-8">
              <p className="text-3xl font-bold text-green-700 mb-4">Quiz Completed!</p>
              <p className="text-2xl mb-4">Your final score: {quizScore}</p>
              <button
                className="bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95"
                onClick={restartQuiz}
              >
                Restart Quiz
              </button>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-green-700 mb-4">Your score: {quizScore}</p>
              <QuizCard />
            </>
          )}
        </div>
      )}

      {/* Scanned Text Viewer (only once, outside of mode blocks) */}
      <div className="w-full max-w-xl mx-auto my-6">
        <h2 className="text-lg font-bold text-green-700 mb-2">Scanned Text</h2>
        <div
          className="bg-gray-50 border border-green-700 rounded-xl p-4 font-mono text-base text-gray-800 shadow-inner overflow-auto selectable-text"
          style={{ maxHeight: '300px', minHeight: '120px', whiteSpace: 'pre-wrap', userSelect: 'text' }}
          id="scannedTextBox"
        >
          {localScannedText || "No text scanned yet."}
        </div>
        <button
          className="mt-4 bg-green-700 text-white px-5 py-2 rounded-lg font-semibold shadow transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95"
          onClick={() => {
            const selection = window.getSelection()
            const selectedText = selection ? selection.toString().trim() : ''
            if (selectedText) {
              generateFlashcards(selectedText)
              setMode('flashcards')
            } else {
              alert('Please highlight some text to generate flashcards.')
            }
          }}
        >
          Generate Flashcards from Selection
        </button>
      </div>

      {scanning && (
        <div className="flex flex-col items-center gap-4">
          <video
            ref={videoRef}
            autoPlay
            onCanPlay={handleVideoCanPlay}
            className="rounded-xl border border-green-700 shadow-lg w-full max-w-md"
          />
          <button
            className="bg-green-700 text-white px-6 py-2 rounded-xl"
            onClick={startCountdown}
            disabled={countdown !== null}
          >
            Capture
          </button>
          <button
            className="bg-red-600 text-white px-6 py-2 rounded-xl"
            onClick={stopCamera}
          >
            Stop Camera
          </button>
        </div>
      )}

      {(isOcrLoading || timedOut /* || dictatedText === '' */) && (
        <Loader
          message={
            isOcrLoading
              ? `Reading text... ${Math.round(ocrProgress * 100)}%`
              : timedOut
              ? "Time's up! Showing the answer..."
              : "Listening for dictated text..."
          }
          progress={isOcrLoading ? ocrProgress : undefined}
        />
      )}

      {cameraError && (
        <div className="text-red-600 font-semibold mb-2">{cameraError}</div>
      )}
      {countdown !== null && (
        <div className="text-3xl font-bold text-green-700 mb-4">Capturing in {countdown}...</div>
      )}
      {cameraTimeout && (
        <div className="text-red-600 font-semibold mb-2">Camera timed out. Please try again.</div>
      )}
    </div>
  )
}


export async function fetchDefinition(word: string): Promise<string> {
  // Dummy implementation, replace with real API call if needed
  return `Definition of ${word}`;
}

export default HomePage
