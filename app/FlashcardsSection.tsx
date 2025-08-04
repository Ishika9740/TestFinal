import { useAppContext } from './AppContext'
import { fetchDefinition } from './lib/dictionary'

export default function FlashcardsSection() {
  const { flashcards: initialFlashcards, setFlashcards, setQuizzes } = useAppContext()

  const generateFlashcards = async (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const cards = await Promise.all(lines.map(async (line) => {
      const keywordMatch = line.match(/\b([A-Z][a-zA-Z0-9]*)\b/);
      const keyword = keywordMatch ? keywordMatch[1] : line.split(' ')[0];
      const definition = await fetchDefinition(keyword);
      return {
        question: `What is "${keyword}"?`,
        answer: definition || line,
      };
    }));
    setFlashcards(cards);
  };

  // Example usage:
  // generateFlashcards("Apple\nBanana\nCarrot");

  return (
    <div className="flex flex-col items-center gap-6">
      {initialFlashcards.map((card, idx) => (
        <div key={idx} className="bg-white border border-green-700 rounded-xl p-4 shadow w-full max-w-md mb-4">
          <div className="font-semibold text-green-700 mb-2">Q: {card.question}</div>
          <div className="text-brown-700">A: {card.answer}</div>
        </div>
      ))}
      <button
        className="bg-green-700 text-white px-4 py-2 rounded-xl"
        onClick={() => {
          generateFlashcards("Apple\nBanana\nCarrot");
          setQuizzes([
            { question: "Sample?", options: ["A", "B", "C"], answer: "A" }
          ]);
        }}
      >
        Generate Flashcards & Quizzes
      </button>
    </div>
  )
}
