'use client'

import React, { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'

export default function Home() {
  const [output, setOutput] = useState('')
  const [showModes, setShowModes] = useState(false)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [showFlash, setShowFlash] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return alert('Please select a file')
    setOutput('<em>Processing...</em>')

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
      setOutput('')
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (!text.trim()) {
          setOutput('<em>File is empty.</em>')
          return
        }
        generateStudyMaterial(text)
      }
      reader.readAsText(file)
    }

    setShowModes(true)
  }

  const processImage = (canvas: HTMLCanvasElement) => {
    setOutput('<em>Scanning image...</em>')
    Tesseract.recognize(canvas, 'eng')
      .then(({ data: { text } }) => {
        if (!text.trim()) {
          setOutput('<em>No text detected in image.</em>')
          return
        }
        generateStudyMaterial(text)
      })
      .catch((err) => {
        setOutput(`<em>OCR failed: ${err}</em>`)
      })
  }

  const generateStudyMaterial = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const cards = lines.map((line) => ({
      question: `What is the key idea in: "${line.slice(0, 50)}..."?`,
      answer: line,
    }))
    const quiz = cards.map((card) => ({
      question: card.question,
      choices: [card.answer, 'Wrong A', 'Wrong B', 'Wrong C'].sort(() => Math.random() - 0.5),
      correct: card.answer,
    }))
    setFlashcards(cards)
    setQuizzes(quiz)
    setShowFlash(true)
  }

  const openCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (videoRef.current) videoRef.current.srcObject = stream
    streamRef.current = stream
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
    closeCamera()
    processImage(canvas)
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
          <input type="file" accept=".txt,.pdf,image/*" onChange={handleFile} />
          <button style={styles.button} onClick={() => document.getElementById('fileInput')?.click()}>
            Generate
          </button>
          <button style={styles.button} onClick={openCamera}>Scan with Camera</button>
        </div>

        {showModes && (
          <div>
            <button style={styles.button} onClick={() => setShowFlash(true)}>Flashcards</button>
            <button style={styles.button} onClick={() => setShowFlash(false)}>Quiz</button>
          </div>
        )}

        <div>
          <video ref={videoRef} autoPlay style={{ width: 320, height: 240, marginTop: 20 }} />
          <button onClick={captureImage}>Capture & Scan</button>
          <button onClick={closeCamera}>Close Camera</button>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div style={styles.output}>
          {showFlash ? (
            <>
              <h2>Flashcards</h2>
              {flashcards.map((card, i) => (
                <div key={i} style={styles.card}>
                  <strong>Q:</strong> {card.question}
                  <br />
                  <strong>A:</strong> {card.answer}
                </div>
              ))}
            </>
          ) : (
            <>
              <h2>Quiz</h2>
              {quizzes.map((q, i) => (
                <div key={i} style={styles.card}>
                  <strong>{q.question}</strong>
                  <ul>
                    {q.choices.map((choice: string, j: number) => (
                      <li key={j}>{choice}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// CSS in JS styles
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
    marginRight: 'auto',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 10,
    margin: '10px 0',
    border: '1px solid #ddd',
    borderRadius: 8,
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