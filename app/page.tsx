'use client'

import React, { useRef, useState } from 'react'
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
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
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
  const [quizScore, setQuizScore] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [cameraLoaded, setCameraLoaded] = useState(false)
  const [cameraTimeout, setCameraTimeout] = useState(false)
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const QUESTION_TIME = 15 // seconds
  const [timeLeft] = useState(QUESTION_TIME)
  const [timedOut] = useState(false)

  // --- Styles ---
  const buttonStyle = {
    backgroundColor: '#2e8b57', // green
    color: '#fff',
    padding: '12px 24px',
    margin: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
  }

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    paddingTop: '2rem',
  }


  // --- Logic ---
  const quizzesToShow = quizzes.slice(0, quizCount)

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
        setMode('flashcards')
        setOcrProgress(0)
        setIsOcrLoading(false)
      })
    }
  }

  const generateFlashcards = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const cards = lines.map((line, i) => ({
      question: `What is line ${i + 1}?`,
      answer: line,
    }))
    setFlashcards(cards)
  }

  const generateQuizzes = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const quizzesGenerated = lines.map((line) => {
      const options = [line]
      while (options.length < 4) {
        const randomLine = lines[Math.floor(Math.random() * lines.length)]
        if (!options.includes(randomLine)) {
          options.push(randomLine)
        }
      }
      return {
        question: `Which line was: "${line.slice(0, 10)}..."?`,
        options: shuffle(options),
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
    if (isCorrect) setQuizScore((prev) => prev + 1)
  }

  const handleQuizNext = () => {
    if (currentQuiz < Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET) - 1) {
      setCurrentQuiz((prev) => prev + 1)
      setQuizFeedback(null)
    } else {
      setQuizCompleted(true)
    }
  }

  const handleQuizPrev = () => {
    if (currentQuiz > 0) {
      setCurrentQuiz((prev) => prev - 1)
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
  }

  const shuffleFlashcards = () => {
    setFlashcards((prev) => {
      const arr = [...prev]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    })
  }

  // --- UI Components ---
  function QuizCard() {
    const quiz = quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz]
    if (!quiz) return null

    // Progress bar width
    const progress = ((currentQuiz + 1) / Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET)) * 100

    return (
      <div className="max-w-md w-full mx-auto bg-white rounded-lg shadow p-4 border-2 border-brown-700 mb-4 transition-colors duration-500">
        {/* Progress Bar / Steps */}
        <div className="w-80 mx-auto mb-4 h-3 bg-gray-200 rounded-lg overflow-hidden relative">
          <div
            className="bg-green-700 h-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute w-full top-0 left-0 text-center text-xs text-brown-700 font-semibold leading-3">
            Question {currentQuiz + 1} / {Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET)}
          </div>
        </div>
        {/* Timer */}
        <div className={`text-center mb-2 font-bold text-lg tracking-wide ${timeLeft <= 5 ? 'text-red-700' : 'text-green-700'}`}>
          ⏰ {timeLeft}s
        </div>
        <div className={`
          rounded-lg p-4 mb-4 transition-colors duration-500
          ${timedOut
            ? 'bg-yellow-100 border-yellow-300'
            : quizFeedback
              ? quizFeedback.correct
                ? 'bg-green-100 border-green-700'
                : 'bg-red-100 border-red-700'
              : 'bg-white border-brown-700'}
          border-2
          shadow
          max-w-md mx-auto
        `}>
          <p className="font-semibold mb-3">{quiz.question}</p>
          <div>
            {quiz.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(option)}
                className={`
                  w-full block px-4 py-2 my-2 rounded-md font-medium text-base text-left
                  transition-all duration-300
                  ${quizFeedback && quizFeedback.selected === option
                    ? quizFeedback.correct
                      ? 'bg-green-200 border-2 border-green-700 text-green-900'
                      : 'bg-red-200 border-2 border-red-700 text-red-900'
                    : timedOut && quiz.answer === option
                      ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-900'
                      : 'bg-white border border-gray-300 text-gray-800 hover:bg-green-50 hover:scale-105 active:scale-95'}
                  flex items-center
                  ${quizFeedback || timedOut ? 'cursor-default' : 'cursor-pointer'}
                `}
                disabled={!!quizFeedback || timedOut}
              >
                <span className="flex-1">{option}</span>
                {/* Animated icon */}
                {quizFeedback && quizFeedback.selected === option && (
                  quizFeedback.correct
                    ? <span className="ml-2 text-green-700 text-xl transition-colors duration-300">✔️</span>
                    : <span className="ml-2 text-red-700 text-xl transition-colors duration-300">❌</span>
                )}
                {timedOut && quiz.answer === option && (
                  <span className="ml-2 text-yellow-500 text-xl transition-colors duration-300">⏰</span>
                )}
              </button>
            ))}
          </div>
          {/* Feedback */}
          {quizFeedback && (
            <p className={`mt-3 font-semibold text-lg transition-colors duration-300 ${quizFeedback.correct ? 'text-green-700' : 'text-red-700'}`}>
              {quizFeedback.correct ? '✅ Correct!' : `❌ Incorrect. Answer: ${quizFeedback.answer}`}
            </p>
          )}
          {timedOut && (
            <p className="mt-3 font-semibold text-lg text-red-700 transition-colors duration-300">
              ⏰ Time&apos;s up! Answer: {quiz.answer}
            </p>
          )}
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={handleQuizPrev}
              className={`
                bg-green-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2
                transition-transform duration-150 hover:scale-105 active:scale-95
                disabled:bg-gray-300 disabled:text-gray-500
              `}
              disabled={currentQuiz === 0 || !!quizFeedback || timedOut}
            >
              <span role="img" aria-label="Prev">⬅️</span> Prev
            </button>
            <button
              onClick={handleQuizNext}
              className={`
                bg-green-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 w-full sm:w-auto
                transition-transform duration-150 hover:scale-105 active:scale-95
                disabled:bg-gray-300 disabled:text-gray-500
              `}
              disabled={
                currentQuiz >= Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET) - 1
                || (!quizFeedback && !timedOut)
              }
            >
              {currentQuiz === Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET) - 1
                ? <>Finish <span role="img" aria-label="Finish">✅</span></>
                : <>Next <span role="img" aria-label="Next">➡️</span></>}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Example: Replace your navigation buttons and flashcard grid with Tailwind classes and icons

  // FlashcardList component (replace your current one)
  function FlashcardList() {
    if (flashcards.length > 1) {
      return (
        <div className="w-full">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center mb-8 w-full max-w-5xl mx-auto"
          >
            {flashcards.map((card, idx) => (
              <div
                key={idx}
                className={`flashcard${flipped && currentFlashcard === idx ? ' flipped' : ''} relative cursor-pointer transition-shadow duration-200 outline-none`}
                tabIndex={0}
                onClick={() => {
                  setCurrentFlashcard(idx)
                  setFlipped((prev) => (currentFlashcard === idx ? !prev : true))
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setCurrentFlashcard(idx)
                    setFlipped((prev) => (currentFlashcard === idx ? !prev : true))
                  }
                }}
              >
                <div className={`flashcard-inner${flipped && currentFlashcard === idx ? ' flipped' : ''}`}>
                  <div className="flashcard-front absolute w-full h-full bg-white rounded-lg shadow flex flex-col items-center justify-center transition-shadow duration-200">
                    <p className="font-semibold text-green-700">Q:</p>
                    <p>{card.question}</p>
                    <div className="mt-4 text-brown-700 text-sm">Click to flip</div>
                  </div>
                  <div className="flashcard-back absolute w-full h-full bg-green-50 rounded-lg shadow flex flex-col items-center justify-center transition-shadow duration-200" style={{ transform: 'rotateY(180deg)' }}>
                    <p className="font-semibold text-brown-700">A:</p>
                    <p>{card.answer}</p>
                    <div className="mt-4 text-green-700 text-sm">Click to flip</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4">
            <button
              className="bg-green-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => {
                setCurrentFlashcard((prev) => Math.max(0, prev - 1))
                setFlipped(false)
              }}
              disabled={currentFlashcard === 0}
            >
              <span role="img" aria-label="Previous">⬅️</span> Previous
            </button>
            <button
              className="bg-green-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => {
                setCurrentFlashcard((prev) => Math.min(flashcards.length - 1, prev + 1))
                setFlipped(false)
              }}
              disabled={currentFlashcard === flashcards.length - 1}
            >
              Next <span role="img" aria-label="Next">➡️</span>
            </button>
            <button
              className="bg-brown-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={shuffleFlashcards}
            >
              <span role="img" aria-label="Shuffle">🔀</span> Shuffle
            </button>
            <button
              className="bg-gray-400 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 transition-transform duration-150 hover:scale-105 active:scale-95"
              onClick={() => setMode('home')}
            >
              <span role="img" aria-label="Back">🏠</span> Back
            </button>
          </div>
        </div>
      )
    }

    // Fallback for 0 or 1 flashcard
    return (
      <div className="flex flex-col items-center">
        {flashcards.length === 1 && (
          <div
            className={`flashcard${flipped ? ' flipped' : ''} relative cursor-pointer transition-shadow duration-200 outline-none`}
            tabIndex={0}
            onClick={() => setFlipped((prev) => !prev)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setFlipped((prev) => !prev)
            }}
          >
            <div className={`flashcard-inner${flipped ? ' flipped' : ''}`}>
              <div className="flashcard-front absolute w-full h-full bg-white rounded-lg shadow flex flex-col items-center justify-center transition-shadow duration-200">
                <p className="font-semibold text-green-700">Q:</p>
                <p>{flashcards[0].question}</p>
                <div className="mt-4 text-brown-700 text-sm">Click to flip</div>
              </div>
              <div className="flashcard-back absolute w-full h-full bg-green-50 rounded-lg shadow flex flex-col items-center justify-center transition-shadow duration-200" style={{ transform: 'rotateY(180deg)' }}>
                <p className="font-semibold text-brown-700">A:</p>
                <p>{flashcards[0].answer}</p>
                <div className="mt-4 text-green-700 text-sm">Click to flip</div>
              </div>
            </div>
          </div>
        )}
        <button
          className="bg-brown-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 mt-4 transition-transform duration-150 hover:scale-105 active:scale-95"
          onClick={shuffleFlashcards}
        >
          <span role="img" aria-label="Shuffle">🔀</span> Shuffle
        </button>
        <button
          className="bg-gray-400 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 mt-2 transition-transform duration-150 hover:scale-105 active:scale-95"
          onClick={() => setMode('home')}
        >
          <span role="img" aria-label="Back">🏠</span> Back
        </button>
      </div>
    )
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Inter', Arial, sans-serif" }}>
      <h1 className="text-3xl sm:text-4xl font-bold text-green-800 text-center bg-brown-700 py-6 rounded-b-2xl mb-8">
        Study Smart
      </h1>

      {mode === 'home' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <button className="bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow transition-transform duration-150 hover:scale-105 active:scale-95 w-64 max-w-full" onClick={() => setMode('scan')}>Scan</button>
          <button className="bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow transition-transform duration-150 hover:scale-105 active:scale-95 w-64 max-w-full" onClick={() => setMode('flashcards')}>Flashcards</button>
          <button className="bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow transition-transform duration-150 hover:scale-105 active:scale-95 w-64 max-w-full" onClick={() => setMode('quiz')}>Quiz</button>
        </div>
      )}

      {mode === 'scan' && (
        <div style={containerStyle}>
          {!scanning && (
            <>
              <button style={buttonStyle} onClick={startCamera}>Start Camera</button>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                style={{ marginBottom: '1rem' }}
              />
              <p>Scan an image or use your camera to extract text.</p>
              {cameraError && <p style={{ color: 'red' }}>{cameraError}</p>}
              <button style={buttonStyle} onClick={() => setMode('home')}>Back</button>
            </>
          )}
          {scanning && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                border: '4px solid #8b5c2e',
                borderRadius: 12,
                marginBottom: 12,
                width: 328,
                height: 248,
                boxSizing: 'border-box',
                position: 'relative',
                animation: 'borderPulse 1.2s infinite alternate'
              }}>
                <video
                  ref={videoRef}
                  style={{
                    width: 320,
                    height: 240,
                    borderRadius: 8,
                    display: 'block',
                    background: '#222'
                  }}
                  autoPlay
                  muted
                  onCanPlay={handleVideoCanPlay}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {countdown !== null && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 64,
                    color: '#2e8b57',
                    fontWeight: 700,
                    zIndex: 2
                  }}>
                    {countdown === 0 ? 'Capture!' : countdown}
                  </div>
                )}
              </div>
              {!cameraLoaded && !cameraTimeout && (
                <div style={{ color: '#8b5c2e', marginBottom: 8 }}>Loading camera...</div>
              )}
              {cameraTimeout && (
                <div style={{ color: 'red', marginBottom: 8 }}>
                  Camera did not load. Please check your permissions or try again.
                </div>
              )}
              <button
                style={buttonStyle}
                onClick={startCountdown}
                disabled={!cameraLoaded || countdown !== null}
              >
                {countdown !== null ? 'Get Ready...' : 'Capture & OCR'}
              </button>
              <button style={buttonStyle} onClick={stopCamera} disabled={countdown !== null}>Cancel</button>
            </div>
          )}
          {ocrProgress > 0 && (
            <div style={{ width: 320, margin: '16px auto' }}>
              <div style={{ background: '#eee', borderRadius: 8, height: 16, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round(ocrProgress * 100)}%`,
                  background: '#2e8b57',
                  height: '100%',
                  transition: 'width 0.2s'
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 4, color: '#2e8b57', fontWeight: 600 }}>
                OCR Progress: {Math.round(ocrProgress * 100)}%
              </div>
            </div>
          )}
          {isOcrLoading && (
            <div style={{ textAlign: 'center', color: '#2e8b57', fontWeight: 600, margin: 16 }}>
              <div className="loader" style={{
                border: '4px solid #eee',
                borderTop: '4px solid #2e8b57',
                borderRadius: '50%',
                width: 40,
                height: 40,
                margin: '0 auto 12px auto',
                animation: 'spin 1s linear infinite'
              }} />
              Scanning image... Please wait.
            </div>
          )}
        </div>
      )}

      {mode === 'flashcards' && (
        <div className="w-full px-2 sm:px-4 md:px-8">
          <FlashcardList />
        </div>
      )}

      {mode === 'quiz' && (
        <div style={containerStyle}>
          <div style={{ marginBottom: 16, fontWeight: 600, color: '#8b5c2e' }}>
            Score: {quizScore} / {Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET)}
          </div>
          {quizCompleted ? (
            <>
              <div style={{ color: '#2e8b57', fontWeight: 700, marginBottom: 16 }}>
                Quiz Complete! Your score: {quizScore} / {Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET)}
              </div>
              <button style={buttonStyle} onClick={restartQuiz}>Restart Quiz</button>
              <button style={buttonStyle} onClick={() => setMode('home')}>Back</button>
            </>
          ) : (
            <>
              {quizzesToShow.length > 0 &&
                quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz] && (
                  <QuizCard />
                )}
              <button style={buttonStyle} onClick={restartQuiz}>Restart Quiz</button>
              <button style={buttonStyle} onClick={() => setMode('home')}>Back</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}



const handleVideoCanPlay = () => {
  // Your logic here, or leave empty if not needed
};
export default HomePage
