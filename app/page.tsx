'use client'

import React, { useEffect, useRef, useState } from 'react'
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

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('home')
  const [imageText, setImageText] = useState('')
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizCount, setQuizCount] = useState(10)
  const [quizSetIndex, setQuizSetIndex] = useState(0)
  const [currentQuiz, setCurrentQuiz] = useState(0)
  const [quizFeedback, setQuizFeedback] = useState<{
    correct: boolean
    selected: string
    answer: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Tesseract.recognize(file, 'eng').then(({ data: { text } }) => {
        setImageText(text)
        generateFlashcards(text)
        generateQuizzes(text)
        setMode('flashcards')
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
    const quizzesGenerated = lines.map((line, i) => {
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
    const current = quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz]
    const isCorrect = option === current.answer
    setQuizFeedback({ correct: isCorrect, selected: option, answer: current.answer })
  }

  const handleQuizNext = () => {
    if (currentQuiz < QUESTIONS_PER_SET - 1) {
      setCurrentQuiz((prev) => prev + 1)
      setQuizFeedback(null)
    }
  }

  const handleQuizPrev = () => {
    if (currentQuiz > 0) {
      setCurrentQuiz((prev) => prev - 1)
      setQuizFeedback(null)
    }
  }

  const quizzesToShow = quizzes.slice(0, quizCount)

  const buttonStyle = {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 24px',
    margin: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  }

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    paddingTop: '2rem',
  }

  const cardStyle = {
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '1rem',
    margin: '1rem',
    width: '80%',
    maxWidth: '400px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  }

  const buttonRowStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '1rem',
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f0fff0', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#2e8b57', padding: '1rem' }}>Study Smart</h1>

      {mode === 'home' && (
        <div style={containerStyle}>
          <button style={buttonStyle} onClick={() => setMode('scan')}>Scan</button>
          <button style={buttonStyle} onClick={() => setMode('flashcards')}>Flashcards</button>
          <button style={buttonStyle} onClick={() => setMode('quiz')}>Quiz</button>
        </div>
      )}

      {mode === 'scan' && (
        <div style={containerStyle}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            style={{ marginBottom: '1rem' }}
          />
          <p>Scan an image of notes to extract text.</p>
          <button style={buttonStyle} onClick={() => setMode('home')}>Back</button>
        </div>
      )}

      {mode === 'flashcards' && (
        <div style={containerStyle}>
          {flashcards.map((card, index) => (
            <div key={index} style={cardStyle}>
              <p><strong>Q:</strong> {card.question}</p>
              <p><strong>A:</strong> {card.answer}</p>
            </div>
          ))}
          <button style={buttonStyle} onClick={() => setMode('home')}>Back</button>
        </div>
      )}

      {mode === 'quiz' && (
        <div style={containerStyle}>
          {quizzesToShow.length > 0 && (
            <div style={cardStyle}>
              <p><strong>{quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz].question}</strong></p>
              <div>
                {quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz].options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px',
                      margin: '5px 0',
                      borderRadius: '5px',
                      backgroundColor:
                        quizFeedback && quizFeedback.selected === option
                          ? quizFeedback.correct
                            ? '#d4edda'
                            : '#f8d7da'
                          : '#e6ffe6',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {quizFeedback && (
                <p style={{ marginTop: 10 }}>
                  {quizFeedback.correct ? '✅ Correct!' : `❌ Incorrect. Answer: ${quizFeedback.answer}`}
                </p>
              )}
              <div style={buttonRowStyle}>
                <button onClick={handleQuizPrev} style={buttonStyle}>Prev</button>
                <button onClick={handleQuizNext} style={buttonStyle}>Next</button>
              </div>
            </div>
          )}
          <button style={buttonStyle} onClick={() => setMode('home')}>Back</button>
        </div>
      )}
    </div>
  )
}
