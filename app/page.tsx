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

const QUESTIONS_PER_SET = 10

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
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null)
  const [imageCanvases, setImageCanvases] = useState<HTMLCanvasElement[]>([])
  const [quizAnswers, setQuizAnswers] = useState<(string | null)[]>([])
  const [quizResults, setQuizResults] = useState<(boolean | null)[]>([])
  const [quizSetIndex, setQuizSetIndex] = useState(0)
  const [showQuizReview, setShowQuizReview] = useState(false)

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
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) return alert('Please select file(s)')

    setOutputHTML('<em>Processing...</em>')

    const imageFiles: File[] = []
    let textContent = ''

    const processNext = (index: number) => {
      if (index >= files.length) {
        // All files processed
        if (imageFiles.length > 0) {
          processMultipleImages(imageFiles)
        } else if (textContent) {
          generateStudyMaterial(textContent)
        }
        setShowModes(true)
        return
      }
      const file = files[index]
      if (file.type.startsWith('image/')) {
        imageFiles.push(file)
        processNext(index + 1)
      } else if (file.type === 'application/pdf') {
        alert('PDF support coming soon. Use a .txt or image file for now.')
        setOutputHTML('')
        processNext(index + 1)
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          if (text && text.trim()) {
            textContent += '\n' + text
          }
          processNext(index + 1)
        }
        reader.readAsText(file)
      }
    }

    processNext(0)
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

  // When switching to quiz mode, reset quiz state
  const startQuiz = () => {
    setShowQuizMode(true)
    setShowFlashcardMode(false)
    setCurrentQuiz(0)
    setQuizSetIndex(0)
    setQuizAnswers(Array(quizzes.length).fill(null))
    setQuizResults(Array(quizzes.length).fill(null))
    setQuizFeedback(null)
    setShowQuizReview(false)
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
    const globalIndex = quizSetIndex * QUESTIONS_PER_SET + currentQuiz
    const correct = choice === quizzes[globalIndex].correct
    setQuizFeedback(correct ? '✅ Correct!' : '❌ Incorrect')
    setQuizAnswers((prev) => {
      const updated = [...prev]
      updated[globalIndex] = choice
      return updated
    })
    setQuizResults((prev) => {
      const updated = [...prev]
      updated[globalIndex] = correct
      return updated
    })
  }
  const handleQuizNext = () => {
    if (currentQuiz < Math.min(QUESTIONS_PER_SET, quizzes.length - quizSetIndex * QUESTIONS_PER_SET) - 1) {
      setCurrentQuiz((prev) => prev + 1)
      setQuizFeedback(null)
    } else {
      setShowQuizReview(true)
    }
  }
  const handleQuizPrev = () => {
    if (currentQuiz > 0) {
      setCurrentQuiz((prev) => prev - 1)
      setQuizFeedback(null)
    }
  }
  const handleNextQuizSet = () => {
    setQuizSetIndex((prev) => prev + 1)
    setCurrentQuiz(0)
    setQuizFeedback(null)
    setShowQuizReview(false)
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

  const handleBackToHome = () => {
    setShowFlashcardMode(false)
    setShowQuizMode(false)
    setShowModes(false)
    setOutputHTML('')
    setCurrentFlashcard(0)
    setCurrentQuiz(0)
    setIsFlipped(false)
    setQuizFeedback(null)
  }

  const processMultipleImages = (files: File[]) => {
    setOutputHTML('<em>Scanning images...</em>')
    const ocrResults: string[] = []
    let processed = 0

    files.forEach((file, idx) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0)
          Tesseract.recognize(canvas, 'eng').then(({ data: { text } }) => {
            ocrResults[idx] = text
            processed++
            if (processed === files.length) {
              const allText = ocrResults.join('\n')
              generateStudyMaterial(allText)
            }
          }).catch(() => {
            ocrResults[idx] = ''
            processed++
            if (processed === files.length) {
              const allText = ocrResults.join('\n')
              generateStudyMaterial(allText)
            }
          })
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
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
          <input type="file" ref={fileInputRef} accept=".txt,.pdf,image/*" className="big-btn" multiple />
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
            <button onClick={handleBackToHome} style={{ ...styles.button, alignSelf: 'flex-start', marginBottom: 24 }}>
              ← Back
            </button>
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
            <button onClick={handleBackToHome} style={{ ...styles.button, alignSelf: 'flex-start', marginBottom: 24 }}>
              ← Back
            </button>
            {!showQuizReview ? (
              <div style={styles.quizCard}>
                <div style={styles.quizQuestion}>
                  {quizzes[quizSetIndex * QUESTIONS_PER_SET + currentQuiz].question}
                </div>
                <div style={styles.quizChoices}>
                  {quizzes[quizSetIndex * QUESTIONS_PER_SET + currentQuiz].choices.map((choice) => (
                    <button
                      key={choice}
                      style={{
                        ...styles.quizChoiceButton,
                        background:
                          quizAnswers[quizSetIndex * QUESTIONS_PER_SET + currentQuiz] === choice
                            ? (choice === quizzes[quizSetIndex * QUESTIONS_PER_SET + currentQuiz].correct ? '#2ecc40' : '#e74c3c')
                            : '#f9f9f9',
                        color:
                          quizAnswers[quizSetIndex * QUESTIONS_PER_SET + currentQuiz] === choice
                            ? '#fff'
                            : '#2e8b57',
                        border:
                          quizAnswers[quizSetIndex * QUESTIONS_PER_SET + currentQuiz] === choice
                            ? '2px solid #2e8b57'
                            : '2px solid #ccc',
                        pointerEvents: quizAnswers[quizSetIndex * QUESTIONS_PER_SET + currentQuiz] ? 'none' : 'auto',
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
                    width: `${((currentQuiz + 1) / Math.min(QUESTIONS_PER_SET, quizzes.length - quizSetIndex * QUESTIONS_PER_SET)) * 100}%`
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
                    {currentQuiz + 1} / {Math.min(QUESTIONS_PER_SET, quizzes.length - quizSetIndex * QUESTIONS_PER_SET)}
                  </span>
                  <button
                    onClick={handleQuizNext}
                    style={{ ...styles.button, marginLeft: 10 }}
                    disabled={!quizAnswers[quizSetIndex * QUESTIONS_PER_SET + currentQuiz]}
                  >
                    {currentQuiz === Math.min(QUESTIONS_PER_SET, quizzes.length - quizSetIndex * QUESTIONS_PER_SET) - 1 ? 'Review' : 'Next'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.quizCard}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16, color: '#4f8cff' }}>
                  Review: Set {quizSetIndex + 1}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: '#43e97b', fontWeight: 700 }}>
                    Correct: {
                      quizResults.slice(
                        quizSetIndex * QUESTIONS_PER_SET,
                        quizSetIndex * QUESTIONS_PER_SET + QUESTIONS_PER_SET
                      ).filter(Boolean).length
                    }
                  </span>
                  <span style={{ margin: '0 16px', color: '#ff5e62', fontWeight: 700 }}>
                    Incorrect: {
                      quizResults.slice(
                        quizSetIndex * QUESTIONS_PER_SET,
                        quizSetIndex * QUESTIONS_PER_SET + QUESTIONS_PER_SET
                      ).filter((v) => v === false).length
                    }
                  </span>
                </div>
                <div>
                  {quizzes.slice(
                    quizSetIndex * QUESTIONS_PER_SET,
                    quizSetIndex * QUESTIONS_PER_SET + QUESTIONS_PER_SET
                  ).map((q, idx) => {
                    const globalIdx = quizSetIndex * QUESTIONS_PER_SET + idx
                    const userAnswer = quizAnswers[globalIdx]
                    const isCorrect = quizResults[globalIdx]
                    return (
                      <div key={q.question} style={{
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 8,
                        background: isCorrect === true ? '#eaffea' : '#ffeaea',
                        border: isCorrect === true ? '2px solid #43e97b' : '2px solid #ff5e62',
                        color: '#222',
                        fontWeight: 500,
                        textAlign: 'left'
                      }}>
                        <div><b>Q{globalIdx + 1}:</b> {q.question}</div>
                        <div>
                          <b>Your answer:</b> {userAnswer || <span style={{ color: '#aaa' }}>No answer</span>}
                          {isCorrect === true && <span style={{ color: '#43e97b', marginLeft: 8 }}>✔</span>}
                          {isCorrect === false && <span style={{ color: '#ff5e62', marginLeft: 8 }}>✘</span>}
                        </div>
                        {isCorrect === false && (
                          <div><b>Correct answer:</b> {q.correct}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {(quizSetIndex + 1) * QUESTIONS_PER_SET < quizzes.length && (
                  <button
                    onClick={handleNextQuizSet}
                    style={{
                      ...styles.button,
                      position: 'fixed',
                      bottom: 32,
                      right: 32,
                      zIndex: 2000,
                      background: 'linear-gradient(90deg, #43e97b 0%, #4f8cff 100%)'
                    }}
                  >
                    Next Set →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Camera */}
        {showCamera && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 20 }}>
            <video ref={videoRef} autoPlay style={{ width: 320, height: 240, borderRadius: 8, border: '1px solid #aaa', background: '#222' }} />
            <button
              onClick={() => {
                const video = videoRef.current
                const canvas = canvasRef.current
                if (!video || !canvas) return
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
                // Save a copy of the canvas
                const newCanvas = document.createElement('canvas')
                newCanvas.width = canvas.width
                newCanvas.height = canvas.height
                newCanvas.getContext('2d')?.drawImage(canvas, 0, 0)
                setImageCanvases(prev => [...prev, newCanvas])
              }}
              style={{ ...styles.button, marginTop: 10 }}
            >
              Capture Photo
            </button>
            <button onClick={closeCamera} style={{ marginTop: 10 }}>Close Camera</button>
            {imageCanvases.length > 0 && (
              <>
                <div style={{ margin: 10 }}>
                  <span style={{ color: '#4f8cff' }}>{imageCanvases.length} photo(s) captured</span>
                </div>
                <button
                  onClick={() => {
                    // OCR all canvases
                    setShowCamera(false)
                    setOutputHTML('<em>Scanning photos...</em>')
                    const ocrResults: string[] = []
                    let processed = 0
                    imageCanvases.forEach((canvas, idx) => {
                      Tesseract.recognize(canvas, 'eng').then(({ data: { text } }) => {
                        ocrResults[idx] = text
                        processed++
                        if (processed === imageCanvases.length) {
                          const allText = ocrResults.join('\n')
                          generateStudyMaterial(allText)
                          setImageCanvases([])
                        }
                      }).catch(() => {
                        ocrResults[idx] = ''
                        processed++
                        if (processed === imageCanvases.length) {
                          const allText = ocrResults.join('\n')
                          generateStudyMaterial(allText)
                          setImageCanvases([])
                        }
                      })
                    })
                  }}
                  style={{ ...styles.button, background: '#43e97b', color: '#fff' }}
                >
                  Process All Photos
                </button>
                <button
                  onClick={() => setImageCanvases([])}
                  style={{ ...styles.button, background: '#ff5e62', color: '#fff' }}
                >
                  Clear Photos
                </button>
              </>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
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
    fontFamily: 'Inter, Arial, sans-serif',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
    minHeight: '100vh',
    minWidth: '100vw',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  h1: {
    color: '#4f8cff',
    fontSize: 'clamp(3rem, 7vw, 5rem)',
    marginBottom: 24,
    fontWeight: 800,
    letterSpacing: '-2px',
    textShadow: '0 4px 24px rgba(79,140,255,0.10)',
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    background: 'linear-gradient(90deg, #4f8cff 0%, #43e97b 100%)',
    color: '#fff',
    padding: '22px 0',
    boxShadow: '0 2px 16px rgba(79,140,255,0.10)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    fontSize: 'clamp(1.6rem, 3vw, 2.3rem)',
    fontWeight: 700,
    letterSpacing: '-1px',
  },
  logo: {
    fontWeight: 900,
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    letterSpacing: '-1px',
    textShadow: '0 2px 8px rgba(67,233,123,0.10)',
  },
  navDesc: {
    fontSize: 'clamp(1.2rem, 2.5vw, 1.7rem)',
    opacity: 0.92,
    fontWeight: 500,
  },
  mainContent: {
    marginTop: 130,
    minHeight: 'calc(100vh - 130px)',
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
    boxShadow: '0 4px 32px rgba(79,140,255,0.10)',
    margin: '20px 0',
    padding: 36,
    borderRadius: 20,
    background: '#fff',
    fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)',
    border: '2px solid #4f8cff22',
  },
  card: {
    transition: 'background 0.3s, box-shadow 0.3s, border 0.3s',
    margin: '20px 0',
    cursor: 'pointer',
    fontSize: 'clamp(2rem, 5vw, 2.8rem)',
    padding: '48px 48px',
    borderRadius: 20,
    border: '3px solid #43e97b',
    color: '#222',
    background: 'linear-gradient(135deg, #fff 60%, #e0eafc 100%)',
    minHeight: 260,
    minWidth: 400,
    maxWidth: 900,
    boxShadow: '0 8px 32px rgba(67,233,123,0.10), 0 2px 8px rgba(79,140,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    wordBreak: 'break-word',
    lineHeight: 1.3,
    fontWeight: 600,
    userSelect: 'none',
  },
  button: {
    fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)',
    padding: '18px 36px',
    margin: '16px',
    borderRadius: 12,
    background: 'linear-gradient(90deg, #4f8cff 0%, #43e97b 100%)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(79,140,255,0.12)',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
  },
  buttonHover: {
    background: 'linear-gradient(90deg, #43e97b 0%, #4f8cff 100%)',
    boxShadow: '0 8px 24px rgba(67,233,123,0.18)',
    transform: 'translateY(-2px) scale(1.03)',
  },
  subtitle: {
    fontSize: 'clamp(1.3rem, 3vw, 2rem)',
    color: '#4f8cff',
    marginBottom: 32,
    marginTop: 8,
    fontWeight: 500,
    letterSpacing: '-0.5px',
  },
  centeredColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  progressBarWrap: {
    width: 340,
    height: 10,
    background: '#e0e0e0',
    borderRadius: 5,
    margin: '22px auto 22px auto',
    overflow: 'hidden',
    maxWidth: '90vw',
    boxShadow: '0 2px 8px #4f8cff11',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #4f8cff 0%, #43e97b 100%)',
    borderRadius: 5,
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
    fontWeight: 600,
    color: '#4f8cff',
    margin: '0 12px',
    letterSpacing: '-0.5px',
  },
  helperText: {
    marginTop: 18,
    fontSize: 'clamp(1rem, 1.5vw, 1.2rem)',
    color: '#888',
    fontStyle: 'italic',
    fontWeight: 500,
  },
  quizCard: {
    background: 'linear-gradient(135deg, #fff 60%, #e0eafc 100%)',
    borderRadius: 22,
    boxShadow: '0 8px 32px rgba(79,140,255,0.10), 0 2px 8px rgba(255,179,71,0.08)',
    padding: '40px 36px',
    minWidth: 340,
    maxWidth: 700,
    margin: '0 auto',
    marginBottom: 28,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '3px solid #ffb347',
  },
  quizQuestion: {
    fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
    color: '#ff5e62',
    marginBottom: 28,
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: '-1px',
  },
  quizChoices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    marginBottom: 22,
  },
  quizChoiceButton: {
    fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
    padding: '18px 24px',
    borderRadius: 12,
    border: '2px solid #4f8cff44',
    background: '#f9f9f9',
    color: '#4f8cff',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s, border 0.2s, transform 0.1s',
    width: '100%',
    textAlign: 'left',
    fontWeight: 600,
    outline: 'none',
    boxShadow: '0 2px 8px #4f8cff11',
  },
  quizFeedback: {
    fontSize: 'clamp(1.2rem, 2vw, 1.5rem)',
    fontWeight: 700,
    margin: '16px 0',
    color: '#43e97b',
    textAlign: 'center',
    minHeight: 24,
    letterSpacing: '-0.5px',
  },
}