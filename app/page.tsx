'use client'
import React, { useState, useRef } from 'react'

import Tesseract from 'tesseract.js'

type Flashcard = {
  question: string
  answer: string
}

type Quiz = {
  question: string
  options: string[]
  answer: string
}

type Mode = 'home' | 'scan' | 'flashcards' | 'quiz'

const QUESTIONS_PER_SET = 5

function HomePage() {
  const [mode, setMode] = useState<Mode>('home')
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  //const [quizzes, setQuizzes] = useState<Quiz[]>([])
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
  const [scannedText, setScannedText] = useState<string | null>(null)
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [dictatedText, setDictatedText] = useState<string>('');
  const [timedOut, setTimedOut] = useState(false)

  const handleVideoCanPlay = () => {
    setCameraLoaded(true)
  }

  // --- Logic ---
  //const quizzesToShow = quizzes.slice(0, quizCount)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsOcrLoading(true)
      Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text' && m.progress) setOcrProgress(m.progress)
        }
      }).then(({ data: { text } }) => {
        generateFlashcards(text)
        generateQuizzes(text)
        setScannedText(text)
        setMode('flashcards')
        setOcrProgress(0)
        setIsOcrLoading(false)
      })
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
    setQuizzes(quizzesGenerated)
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
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setOcrProgress(0)
    setScanning(false)
    stopCamera()
    const dataUrl = canvas.toDataURL('image/png')
    setIsOcrLoading(true)
    Tesseract.recognize(dataUrl, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && m.progress) setOcrProgress(m.progress)
      }
    }).then(({ data: { text } }) => {
      generateFlashcards(text)
      generateQuizzes(text)
      setScannedText(text)
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
  }

  // --- UI Components ---
  // FlashcardList component (replace your current one)
  function FlashcardList() {
    if (flashcards.length > 0) {
      return (
        <div className="flex flex-col items-center gap-6">
          <div className="flashcard relative cursor-pointer" tabIndex={0}
            onClick={() => setFlipped((prev) => !prev)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setFlipped((prev) => !prev)
            }}
          >
            <div className={`flashcard-inner${flipped ? ' flipped' : ''}`}>
              <div className="flashcard-front bg-white">
                <p className="font-semibold text-green-700">Q:</p>
                <p>{flashcards[currentFlashcard].question}</p>
                <div className="mt-4 text-brown-700 text-sm">Click to flip</div>
              </div>
              <div className="flashcard-back">
                <p className="font-semibold text-brown-700">A:</p>
                <p>{flashcards[currentFlashcard].answer}</p>
                <div className="mt-4 text-green-700 text-sm">Click to flip</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <button
              className="bg-green-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => {
                setCurrentFlashcard((prev: number) => Math.max(0, prev - 1));
                setFlipped(false);
              }}
              disabled={currentFlashcard === 0}
            >
              <span role="img" aria-label="Previous">⬅️</span> Previous
            </button>
            <button
              className="bg-green-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => {
                setCurrentFlashcard((prev: number) => Math.min(flashcards.length - 1, prev + 1))
                setFlipped(false);
              }}
              disabled={currentFlashcard === flashcards.length - 1}
            >
              Next <span role="img" aria-label="Next">➡️</span>
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

    const current = quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz]

    const handleSelect = (option: string) => {
      if (showAnswer) return
      setSelected(option)
      const isCorrect = option === current.answer
      setQuizFeedback({ correct: isCorrect, selected: option, answer: current.answer })
      if (isCorrect) setQuizScore((prev: number) => prev + 1)
    }

    const handleShowAnswer = () => {
      setShowAnswer(true)
    }

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4">
        <div className="text-lg font-semibold text-green-800">
          {current.question}
        </div>
        <div className="flex flex-col gap-2">
          {current.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 justify-between
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
        <div className="flex justify-between gap-4">
          <button
            onClick={handleQuizPrev}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:bg-gray-300 flex-1"
            disabled={currentQuiz === 0}
          >
            <span role="img" aria-label="Previous">⬅️</span> Previous
          </button>
          <button
            onClick={showAnswer ? handleQuizNext : handleShowAnswer}
            className="bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:bg-green-800 flex-1"
          >
            {showAnswer ? 'Next Question' : 'Show Answer'}
          </button>
        </div>
        {showAnswer && (
          <div className="mt-4 text-center">
            <button
              onClick={handleQuizNext}
              className="bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:bg-green-800"
            >
              Next Question
            </button>
          </div>
        )}
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
          <button className="bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 w-full">
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
        <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-8 bg-white rounded-xl shadow-lg">
          {!scanning && (
            <div className="w-full flex flex-col items-center gap-4">
              <button className="bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 w-full" onClick={startCamera}>Start Camera</button>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="mb-4 px-4 py-2 rounded-xl border border-green-300 shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 w-full"
              />
              <p className="text-center text-brown-700">Scan an image or use your camera to extract text.</p>
              {cameraError && <p className="text-center text-red-600">{cameraError}</p>}
              <button className="bg-white text-green-700 px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-50 hover:scale-105 active:scale-95 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 w-full" onClick={() => setMode('home')}>Back</button>
            </div>
          )}
          {scanning && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="relative border-4 border-brown-700 rounded-xl mb-4 w-full max-w-xs h-64 flex items-center justify-center bg-gray-100">
                <video
                  ref={videoRef}
                  className="w-full h-full rounded-xl bg-gray-900"
                  autoPlay
                  muted
                  onCanPlay={handleVideoCanPlay}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {countdown !== null && (
                  <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center text-6xl text-green-700 font-bold z-10">
                    {countdown === 0 ? 'Capture!' : countdown}
                  </div>
                )}
              </div>
              {!cameraLoaded && !cameraTimeout && (
                <div className="text-brown-700 mb-2">Loading camera...</div>
              )}
              {cameraTimeout && (
                <div className="text-red-600 mb-2">
                  Camera did not load. Please check your permissions or try again.
                </div>
              )}
              <div className="flex gap-4 w-full">
                <button
                  className="bg-green-700 text-white px-6 py-2 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 flex-1"
                  onClick={startCountdown}
                  disabled={!cameraLoaded || countdown !== null}
                >
                  {countdown !== null ? 'Get Ready...' : 'Capture & OCR'}
                </button>
                <button
                  className="bg-gray-400 text-white px-6 py-2 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-gray-500 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-300 flex-1"
                  onClick={stopCamera}
                  disabled={countdown !== null}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {ocrProgress > 0 && (
            <div className="w-full max-w-xs mx-auto mt-4">
              <div className="bg-gray-200 rounded-xl h-4 overflow-hidden">
                <div
                  className="bg-green-700 h-full transition-all duration-200"
                  style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                />
              </div>
              <div className="text-center mt-2 text-green-700 font-semibold">
                OCR Progress: {Math.round(ocrProgress * 100)}%
              </div>
            </div>
          )}
          {isOcrLoading && (
            <div className="flex flex-col items-center justify-center mt-4">
              <div className="loader mb-2" style={{
                border: '4px solid #eee',
                borderTop: '4px solid #2e8b57',
                borderRadius: '50%',
                width: 40,
                height: 40,
                animation: 'spin 1s linear infinite'
              }} />
              <span className="text-green-700 font-semibold">Processing text…</span>
            </div>
          )}
        </div>
      )}

      {mode === 'flashcards' && (
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 md:px-8">
          <FlashcardList />
        </div>
      )}
      {mode === 'quiz' && (
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 md:px-8">
          <p className="text-2xl font-bold text-green-700 mb-4">Your score: {quizScore}</p>
          <QuizCard />
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
          {scannedText || "No text scanned yet."}
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
    </div>
  )
}

export default HomePage