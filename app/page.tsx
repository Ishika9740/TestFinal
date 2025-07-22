'use client'

import React, { useRef, useState, useEffect } from 'react'
import Tesseract from 'tesseract.js'

type Flashcard = {
  question: string
  answer: string
}

type Quiz = {
  question: string
  choices: string[]
  correct: string
}

export default function Home() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [showModes, setShowModes] = useState(false)
  const [outputHTML, setOutputHTML] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [showFlashcardMode, setShowFlashcardMode] = useState(false)
  const [showQuizMode, setShowQuizMode] = useState(false)
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [currentQuiz, setCurrentQuiz] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    // Cleanup camera stream on unmount
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const handleFile = () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return alert('Please select a file')

    setOutputHTML('<em>Processing...</em>')

    if (file.type.startsWith('image/')) {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0)
          processImage(canvas)
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    } else if (file.type === 'application/pdf') {
      alert('PDF support coming soon. Use a .txt or image file for now.')
      setOutputHTML('')
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (!text.trim()) {
          setOutputHTML('<em>File is empty.</em>')
          return
        }
        generateStudyMaterial(text)
      }
      reader.readAsText(file)
    }

    setShowModes(true)
  }

  const generateStudyMaterial = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const flash = lines.map((line) => ({
      question: `What is the key idea in: "${line.slice(0, 50)}..."?`,
      answer: line,
    }))
    const quiz = flash.map((card) => ({
      question: card.question,
      choices: [card.answer, 'Wrong A', 'Wrong B', 'Wrong C'].sort(() => Math.random() - 0.5),
      correct: card.answer,
    }))
    setFlashcards(flash)
    setQuizzes(quiz)
    setShowFlashcardMode(false)
    setOutputHTML('')
    setCurrentFlashcard(0)
    setIsFlipped(false)
  }

  const processImage = (canvas: HTMLCanvasElement) => {
    setOutputHTML('<em>Scanning image...</em>')
    Tesseract.recognize(canvas, 'eng').then(({ data: { text } }) => {
      if (!text.trim()) {
        setOutputHTML('<em>No text detected in image.</em>')
        return
      }
      generateStudyMaterial(text)
    }).catch((err) => {
      setOutputHTML(`<em>OCR failed: ${err}</em>`)
    })
  }

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
    } catch (err) {
      alert('Could not access camera: ' + err)
    }
  }

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setShowCamera(false)
  }

  const captureImage = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
    closeCamera()
    processImage(canvas)
  }

  // When switching to quiz mode, reset quiz state
  const startQuiz = () => {
    setShowQuizMode(true)
    setShowFlashcardMode(false)
    setCurrentQuiz(0)
    setSelectedChoice(null)
    setQuizFeedback(null)
    setOutputHTML('')
  }

  // When switching to flashcard mode, reset flashcard state
  const startFlashcards = () => {
    setShowFlashcardMode(true)
    setShowQuizMode(false)
    setIsFlipped(false)
    setCurrentFlashcard(0)
    setOutputHTML('')
  }

  // Quiz handlers
  const handleQuizChoice = (choice: string) => {
    setSelectedChoice(choice)
    if (choice === quizzes[currentQuiz].correct) {
      setQuizFeedback('✅ Correct!')
    } else {
      setQuizFeedback('❌ Incorrect')
    }
  }
  const handleQuizNext = () => {
    setCurrentQuiz((prev) => Math.min(prev + 1, quizzes.length - 1))
    setSelectedChoice(null)
    setQuizFeedback(null)
  }
  const handleQuizPrev = () => {
    setCurrentQuiz((prev) => Math.max(prev - 1, 0))
    setSelectedChoice(null)
    setQuizFeedback(null)
  }

  // Flashcard navigation handlers
  const handlePrev = () => {
    setCurrentFlashcard((prev) => Math.max(prev - 1, 0))
    setIsFlipped(false)
  }
  const handleNext = () => {
    setCurrentFlashcard((prev) => Math.min(prev + 1, flashcards.length - 1))
    setIsFlipped(false)
  }
  const handleFlip = () => setIsFlipped((f) => !f)

  const renderQuizzes = (questions: Quiz[]) => {
    setShowFlashcardMode(false)
    setOutputHTML(
      `<h2>Quiz</h2>` +
        questions
          .map(
            (q) =>
              `<div class="card"><strong>${q.question}</strong><ul>` +
              q.choices.map((c: string) => `<li>${c}</li>`).join('') +
              `</ul></div>`
          )
          .join('')
    )
  }

  return (
    <div style={styles.body}>
      <nav style={styles.navbar}>
        <span style={styles.logo}>📚 Study Smart</span>
        <span style={styles.navDesc}>Turn your notes into flashcards & quizzes!</span>
      </nav>

      <div style={styles.mainContent}>
        <h1 style={styles.h1}>📚 Study Smart</h1>
        <p style={styles.subtitle}>Upload your notes, or scan a document to turn them into flashcards and quizzes!</p>

        <div style={{ display: showModes ? 'none' : 'block' }}>
          <input type="file" ref={fileInputRef} accept=".txt,.pdf,image/*" className="big-btn" />
          <button onClick={handleFile} style={styles.button}>Generate</button>
          <button onClick={openCamera} style={styles.button}>Scan with Camera</button>
        </div>

        {showModes && (
          <div style={{ marginTop: 24, display: 'flex', gap: 24 }}>
            <button onClick={startFlashcards} style={styles.button}>Flashcards</button>
            <button onClick={startQuiz} style={styles.button}>Quiz</button>
          </div>
        )}

        {/* Flashcard Mode */}
        {showFlashcardMode && flashcards.length > 0 && (
          <div style={styles.centeredColumn}>
            <div
              style={{
                ...styles.card,
                minHeight: 220,
                minWidth: 340,
                maxWidth: 700,
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                background: isFlipped ? '#4682b4' : '#2e8b57',
                boxShadow: isFlipped
                  ? '0 8px 32px rgba(70,130,180,0.18)'
                  : '0 8px 32px rgba(46,139,87,0.18)',
                transition: 'background 0.3s, box-shadow 0.3s',
              }}
              onClick={handleFlip}
              tabIndex={0}
              aria-label="Flashcard"
            >
              {isFlipped
                ? flashcards[currentFlashcard].answer
                : flashcards[currentFlashcard].question}
            </div>
            <div style={styles.progressBarWrap}>
              <div style={{
                ...styles.progressBar,
                width: `${((currentFlashcard + 1) / flashcards.length) * 100}%`
              }} />
            </div>
            <div>
              <button
                onClick={handlePrev}
                style={{ ...styles.button, marginRight: 10 }}
                disabled={currentFlashcard === 0}
              >
                Previous
              </button>
              <span style={styles.progressText}>
                {currentFlashcard + 1} / {flashcards.length}
              </span>
              <button
                onClick={handleNext}
                style={{ ...styles.button, marginLeft: 10 }}
                disabled={currentFlashcard === flashcards.length - 1}
              >
                Next
              </button>
            </div>
            <div style={styles.helperText}>
              Click the card to flip between question and answer.
            </div>
          </div>
        )}

        {/* Quiz Mode */}
        {showQuizMode && quizzes.length > 0 && (
          <div style={styles.centeredColumn}>
            <div style={styles.quizCard}>
              <div style={styles.quizQuestion}>
                {quizzes[currentQuiz].question}
              </div>
              <div style={styles.quizChoices}>
                {quizzes[currentQuiz].choices.map((choice, idx) => (
                  <button
                    key={choice}
                    style={{
                      ...styles.quizChoiceButton,
                      background:
                        selectedChoice === choice
                          ? (choice === quizzes[currentQuiz].correct ? '#2ecc40' : '#e74c3c')
                          : '#f9f9f9',
                      color:
                        selectedChoice === choice
                          ? '#fff'
                          : '#2e8b57',
                      border:
                        selectedChoice === choice
                          ? '2px solid #2e8b57'
                          : '2px solid #ccc',
                      pointerEvents: selectedChoice ? 'none' : 'auto',
                    }}
                    onClick={() => handleQuizChoice(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              {quizFeedback && (
                <div style={styles.quizFeedback}>{quizFeedback}</div>
              )}
              <div style={styles.progressBarWrap}>
                <div style={{
                  ...styles.progressBar,
                  width: `${((currentQuiz + 1) / quizzes.length) * 100}%`
                }} />
              </div>
              <div>
                <button
                  onClick={handleQuizPrev}
                  style={{ ...styles.button, marginRight: 10 }}
                  disabled={currentQuiz === 0}
                >
                  Previous
                </button>
                <span style={styles.progressText}>
                  {currentQuiz + 1} / {quizzes.length}
                </span>
                <button
                  onClick={handleQuizNext}
                  style={{ ...styles.button, marginLeft: 10 }}
                  disabled={currentQuiz === quizzes.length - 1}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera */}
        {showCamera && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 20 }}>
            <video ref={videoRef} autoPlay style={{ width: 320, height: 240, borderRadius: 8, border: '1px solid #aaa', background: '#222' }} />
            <button onClick={captureImage} style={{ ...styles.button, marginTop: 10 }}>Capture & Scan</button>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button onClick={closeCamera} style={{ marginTop: 10 }}>Close Camera</button>
          </div>
        )}

        {/* Output for quiz/flashcards not shown */}
        {!showFlashcardMode && !showQuizMode && (
          <div id="output" dangerouslySetInnerHTML={{ __html: outputHTML }} style={styles.output} />
        )}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    backgroundColor: '#e6f7ee',
    minHeight: '100vh',
    minWidth: '100vw',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  h1: {
    color: '#2e8b57',
    fontSize: 'clamp(2.8rem, 7vw, 4.5rem)',
    marginBottom: 24,
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    background: '#2e8b57',
    color: '#fff',
    padding: '20px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
  },
  logo: {
    fontWeight: 'bold',
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
  },
  navDesc: {
    fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)',
    opacity: 0.85,
  },
  mainContent: {
    marginTop: 120,
    minHeight: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  output: {
    marginTop: 30,
    textAlign: 'left',
    maxWidth: 700,
    minWidth: 320,
    marginLeft: 'auto',
    marginRight: 'auto',
    boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
    margin: '20px 0',
    padding: 32,
    borderRadius: 16,
    backgroundColor: '#f9f9f9',
    fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)',
  },
  card: {
    transition: 'background-color 0.3s',
    margin: '20px 0',
    cursor: 'pointer',
    fontSize: 'clamp(2rem, 5vw, 2.8rem)',
    padding: '40px 40px',
    borderRadius: 16,
    border: 'none',
    color: '#fff',
    backgroundColor: '#2e8b57',
    minHeight: 260,
    minWidth: 400,
    maxWidth: 900,
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    wordBreak: 'break-word',
    lineHeight: 1.3,
  },
  button: {
    fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)',
    padding: '18px 36px',
    margin: '16px',
    borderRadius: 12,
    background: '#2e8b57',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  },
  subtitle: {
    fontSize: 'clamp(1.3rem, 3vw, 2rem)',
    color: '#2e8b57',
    marginBottom: 32,
    marginTop: 8,
    fontWeight: 500,
  },
  centeredColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  progressBarWrap: {
    width: 320,
    height: 8,
    background: '#e0e0e0',
    borderRadius: 4,
    margin: '18px auto 18px auto',
    overflow: 'hidden',
    maxWidth: '90vw',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #2e8b57 0%, #4682b4 100%)',
    borderRadius: 4,
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
    fontWeight: 500,
    color: '#2e8b57',
    margin: '0 12px',
  },
  helperText: {
    marginTop: 14,
    fontSize: 'clamp(1rem, 1.5vw, 1.2rem)',
    color: '#555',
    fontStyle: 'italic',
  },
  quizCard: {
    background: '#fff',
    borderRadius: 18,
    boxShadow: '0 4px 32px rgba(46,139,87,0.10)',
    padding: '36px 32px',
    minWidth: 340,
    maxWidth: 700,
    margin: '0 auto',
    marginBottom: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  quizQuestion: {
    fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
    color: '#2e8b57',
    marginBottom: 24,
    fontWeight: 600,
    textAlign: 'center',
  },
  quizChoices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    width: '100%',
    marginBottom: 18,
  },
  quizChoiceButton: {
    fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
    padding: '18px 24px',
    borderRadius: 10,
    border: '2px solid #ccc',
    background: '#f9f9f9',
    color: '#2e8b57',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s, border 0.2s',
    width: '100%',
    textAlign: 'left',
    fontWeight: 500,
    outline: 'none',
  },
  quizFeedback: {
    fontSize: 'clamp(1.2rem, 2vw, 1.5rem)',
    fontWeight: 600,
    margin: '12px 0',
    color: '#4682b4',
    textAlign: 'center',
  },
}