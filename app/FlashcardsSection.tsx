import { useAppContext } from './AppContext'

export default function FlashcardsSection() {
  const { flashcards } = useAppContext()
  // Render your flashcards here
  if (!flashcards || flashcards.length === 0) {
    return <div className="text-center text-brown-700">No flashcards available.</div>
  }
  return (
    <div className="flex flex-col items-center gap-6">
      {flashcards.map((card, idx) => (
        <div key={idx} className="bg-white border border-green-700 rounded-xl p-4 shadow w-full max-w-md mb-4">
          <div className="font-semibold text-green-700 mb-2">Q: {card.question}</div>
          <div className="text-brown-700">A: {card.answer}</div>
        </div>
      ))}
    </div>
  )
}
