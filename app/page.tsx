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
  const [showFlashcards, setShowFlashcards] = useState(true)
  const [showModes, setShowModes] = useState(false)
  const [outputHTML, setOutputHTML] = useState('')
  const [showCamera, setShowCamera] = useState(false)

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
    setShowFlashcards(true)
    renderFlashcards(flash)
  }

  const renderFlashcards = (cards: Flashcard[]) => {
    setOutputHTML(`<h2>Flashcards</h2>` + cards.map(card =>
      `<div class="card"><strong>Q:</strong> ${card.question}<br/><strong>A:</strong> ${card.answer}</div>`
    ).join(''))
  }

  const renderQuizzes = (questions: Quiz[]) => {
    setOutputHTML(`<h2>Quiz</h2>` + questions.map(q =>
      `<div class="card"><strong>${q.question}</strong><ul>` +
      q.choices.map((c: string) => `<li>${c}</li>`).join('') +
      `</ul></div>`
    ).join(''))
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

  return (
    <div style={styles.body}>
      <nav style={styles.navbar}>
        <span style={styles.logo}>📚 Study Smart</span>
        <span style={styles.navDesc}>Turn your notes into flashcards & quizzes!</span>
      </nav>

      <div style={styles.mainContent}>
        <h1 style={styles.h1}>📚 Study Smart</h1>
        <p>Upload your notes, or scan a document to turn them into flashcards and quizzes!</p>

        <div style={{ display: showModes ? 'none' : 'block' }}>
          <input type="file" ref={fileInputRef} accept=".txt,.pdf,image/*" className="big-btn" />
          <button onClick={handleFile} style={styles.button}>Generate</button>
          <button onClick={openCamera} style={styles.button}>Scan with Camera</button>
        </div>

        {showModes && (
          <div style={{ marginTop: 20 }}>
            <button onClick={() => { setShowFlashcards(true); renderFlashcards(flashcards) }} style={styles.button}>Flashcards</button>
            <button onClick={() => { setShowFlashcards(false); renderQuizzes(quizzes) }} style={styles.button}>Quiz</button>
          </div>
        )}

        {showCamera && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 20 }}>
            <video ref={videoRef} autoPlay style={{ width: 320, height: 240, borderRadius: 8, border: '1px solid #aaa', background: '#222' }} />
            <button onClick={captureImage} style={{ ...styles.button, marginTop: 10 }}>Capture & Scan</button>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button onClick={closeCamera} style={{ marginTop: 10 }}>Close Camera</button>
          </div>
        )}

        <div id="output" dangerouslySetInnerHTML={{ __html: outputHTML }} style={styles.output} />
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    backgroundColor: '#f0fff0',
    padding: 20,
  },
  h1: {
    color: '#2e8b57',
  },
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    background: '#2e8b57',
    color: '#fff',
    padding: '12px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  logo: {
    fontWeight: 'bold',
    fontSize: '1.3em',
  },
  navDesc: {
    fontSize: '1em',
    opacity: 0.85,
  },
  mainContent: {
    marginTop: 80,
  },
  output: {
    marginTop: 20,
    textAlign: 'left',
    maxWidth: 600,
    marginLeft: 'auto',

























}  },    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',    margin: '10px 0',    padding: 15,    borderRadius: 8,    backgroundColor: '#f9f9f9',  card: {  },    transition: 'background-color 0.3s',    margin: '10px 0',    cursor: 'pointer',    fontSize: '1em',    padding: '10px 20px',    borderRadius: 4,    border: 'none',    color: '#fff',    backgroundColor: '#2e8b57',  button: {  },    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',    backgroundColor: '#fff',    borderRadius: 8,    padding: 10,    marginRight: 'auto',    marginRight: 'auto',
  },
  button: {
    fontSize: '1em',
    padding: '12px 24px',
    margin: '10px',
    borderRadius: 8,
    background: '#2e8b57',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
}