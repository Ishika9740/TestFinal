import React, { createContext, useContext, useState } from 'react'

export type Flashcard = { question: string; answer: string }
export type Quiz = { question: string; options: string[]; answer: string }

type AppContextType = {
  scannedText: string | null
  setScannedText: (text: string | null) => void
  flashcards: Flashcard[]
  setFlashcards: (cards: Flashcard[]) => void
  quizzes: Quiz[]
  setQuizzes: (quizzes: Quiz[]) => void
  quizAnswers: Record<number, string>
  setQuizAnswers: (answers: Record<number, string>) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [scannedText, setScannedText] = useState<string | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})

  return (
    <AppContext.Provider value={{
      scannedText, setScannedText,
      flashcards, setFlashcards,
      quizzes, setQuizzes,
      quizAnswers, setQuizAnswers
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}