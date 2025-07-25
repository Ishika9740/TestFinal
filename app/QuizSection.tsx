import { useAppContext } from './AppContext'
import { useState } from 'react'

export default function QuizSection() {
  const { quizzes = [], quizAnswers = {}, setQuizAnswers = () => {} } = useAppContext()
  const [current, setCurrent] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (quizzes.length === 0) {
    return <div>No quizzes available.</div>
  }

  const quiz = quizzes[current]
  const selected = quizAnswers[current]

  const handleSelect = (option: string) => {
    setQuizAnswers({ ...quizAnswers, [current]: option })
    if (option === quiz.answer) {
      setFeedback('Correct!')
    } else {
      setFeedback(`Incorrect. Correct answer: ${quiz.answer}`)
    }
  }

  const handleNext = () => {
    setFeedback(null)
    setCurrent((prev) => Math.min(prev + 1, quizzes.length - 1))
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-4 font-bold text-xl">{quiz.question}</div>
      <div className="flex flex-col gap-2 mb-4">
        {quiz.options.map((option, idx) => (
          <button
            key={idx}
            className={`px-4 py-2 rounded border ${selected === option ? 'bg-green-200' : 'bg-white'}`}
            onClick={() => handleSelect(option)}
            disabled={!!selected}
          >
            {option}
          </button>
        ))}
      </div>
      {feedback && <div className="mb-4">{feedback}</div>}
      <button
        className="mt-2 px-4 py-2 bg-green-700 text-white rounded"
        onClick={handleNext}
        disabled={current === quizzes.length - 1}
      >
        Next
      </button>
    </div>
  )
}