'use client'
import React, { useState, useRef } from 'react'
import type { JSX } from 'react'
import Tesseract from 'tesseract.js'
import ScanSection from './ScanSection'
import Loader from './Loader'
import { useAppContext } from './AppContext'
//import type { Dispatch, SetStateAction } from 'react'
//import type { Mode } from "./page"

type Mode = 'home' | 'scan' | 'flashcards' | 'quiz'


type Flashcard = {
  question: string
  answer: string
}


type Quiz = {
  question: string
  options: string[]
  answer: string
}

const QUESTIONS_PER_SET = 5

function HomePage(): JSX.Element {
  const [ocrText, setOcrText] = useState<string>("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [mode, setMode] = useState<Mode>('home');
  const [quizzes, setQuizzesState] = useState<Quiz[]>([]);
  // const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizCount] = useState(10);
  const [quizSetIndex] = useState(0);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<{
    correct: boolean;
    selected: string;
    answer: string;
  } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [cameraLoaded, setCameraLoaded] = useState(false)
  const [cameraTimeout, setCameraTimeout] = useState(false)
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [localScannedText, setLocalScannedText] = useState<string | null>(null)
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  //const [dictatedText, setDictatedText] = useState<string>('');
  const [timedOut, setTimedOut] = useState(false)

  const { setQuizzes, setScannedText } = useAppContext();

  const handleVideoCanPlay = () => {
    setCameraLoaded(true)
  }

  // --- Logic ---
  const quizzesToShow = quizzes.slice(0, quizCount)


  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsOcrLoading(true)
      const img = new window.Image()
      img.onload = () => {
        // Resize image
        const targetWidth = 640
        const scale = targetWidth / img.width
        const targetHeight = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        Tesseract.recognize(dataUrl, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text' && m.progress) setOcrProgress(m.progress);
          }
        })
        .then(({ data: { text } }) => {
          console.log("OCR result from upload:", text);
          setOcrText(text);
          generateFlashcards(text);
          generateQuizzes(text);
          setScannedText(text);
          setLocalScannedText(text);
          setMode('flashcards');
          setOcrProgress(0);
          setIsOcrLoading(false);
        })
        .catch((error) => {
          console.error("OCR failed on camera:", error);
          setIsOcrLoading(false);
        });
      }
      img.src = URL.createObjectURL(file)
    }
  }
  const generateFlashcards = (text: string) => {
    // Split text into lines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    // Create flashcards from each line
    const cards = lines.map((line) => {
      // Extract keyword: first capitalized word or first word
      const keywordMatch = line.match(/\b([A-Z][a-zA-Z0-9]*)\b/);
      const keyword = keywordMatch ? keywordMatch[1] : line.split(' ')[0];
      return {
        question: `What is "${keyword}"?`,
        answer: line,
      };
    });
    setFlashcards(cards); // Update flashcards state
  }

  const generateQuizzes = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim() !== '')
    const quizzesGenerated = lines.map((line) => {
      // Helper to reword for distractors
      const makeDistractor = (sentence: string) => {
        // Remove first keyword/capitalized word
        const keywordMatch = sentence.match(/\b([A-Z][a-zA-Z0-9]*)\b/)
        if (keywordMatch) {
          // Replace keyword with a generic word
          return sentence.replace(keywordMatch[1], "Something")
        }
        // Shuffle words for another distractor
        const words = sentence.split(' ')
        if (words.length > 3) {
          const shuffled = [...words].sort(() => Math.random() - 0.5)
          return shuffled.join(' ')
        }
        // Add a generic prefix for another distractor
        return "Fact: " + sentence
      }

      // Generate 3 distractors
      const distractors: string[] = []
      while (distractors.length < 3) {
        const distractor = makeDistractor(line)
        // Ensure distractor is not the same as the correct answer or already added
        if (distractor !== line && !distractors.includes(distractor)) {
          distractors.push(distractor)
        }
      }

      const options = shuffle([line, ...distractors])
      return {
        question: `Which is correct about "${line.slice(0, 10)}..."?`,
        options,
        answer: line,
      }
    })
    setQuizzesState(quizzesGenerated)
    setQuizzes(quizzesGenerated) // <-- Add this line to update context
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
    if (isCorrect) setQuizScore((prev: number) => prev + 1)
  }

  const handleQuizNext = () => {
    if (currentQuiz < Math.min(QUESTIONS_PER_SET, quizzesToShow.length - quizSetIndex * QUESTIONS_PER_SET) - 1) {
      setCurrentQuiz((prev: number) => prev + 1)
      setQuizFeedback(null)
    } else {
      setQuizCompleted(true)
    }
  }

  const handleQuizPrev = () => {
    if (currentQuiz > 0) {
      setCurrentQuiz((prev: number) => prev - 1)
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

    // Resize to a smaller width for faster OCR (e.g., 640px wide)
    const targetWidth = 640
    const scale = targetWidth / video.videoWidth
    const targetHeight = Math.round(video.videoHeight * scale)
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
    setOcrProgress(0)
    setScanning(false)
    stopCamera()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setIsOcrLoading(true)
    Tesseract.recognize(dataUrl, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && m.progress) setOcrProgress(m.progress);
      }
    })
    .then(({ data: { text } }) => {
      console.log("OCR result from upload:", text);
      setOcrText(text);
      generateFlashcards(text);
      generateQuizzes(text);
      setScannedText(text);
      setLocalScannedText(text);
      setMode('flashcards');
      setOcrProgress(0);
      setIsOcrLoading(false);
    })
    .catch((error) => {
      console.error("OCR failed on upload:", error);
      setIsOcrLoading(false);
    });
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
    setTimedOut(false)
  }

  // --- UI Components ---
  return (
    <div className="min-h-screen bg-white font-sans text-lg flex flex-col items-center justify-center px-2 sm:px-4 md:px-8">
      <h1 className="text-4xl sm:text-5xl font-bold text-green-800 text-center bg-brown-700 py-6 rounded-b-2xl mb-8 w-full max-w-2xl mx-auto">
        Study Smart
      </h1>

      {mode === 'home' && (
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 py-8 bg-white rounded-xl shadow-lg">
          <button
            className="bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 w-full"
            onClick={startCamera}
          >
            Scan with Camera
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="mb-4 px-4 py-2 rounded-xl border border-green-300 shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition-all duration-200 w-full"
          />
          <button
            className="bg-white text-green-700 px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-50 hover:scale-105 active:scale-95 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 w-full"
            onClick={() => setMode('home')}
          >
            Back
          </button>
        </div>
      )}

      {mode === 'scan' && (
        <ScanSection setMode={setMode} />
      )}

      {mode === 'flashcards' && (
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 md:px-8">
          <div className="flex flex-col items-center gap-6 py-8">
            {flashcards.length === 0 ? (
              <p className="text-gray-600">No flashcards generated yet.</p>
            ) : (
              <div className="w-full max-w-xl flex flex-col items-center">
                <div
                  className={`bg-green-50 border border-green-700 rounded-xl p-4 shadow w-full mb-4 cursor-pointer transition-transform duration-200 ${flipped ? 'rotate-y-180' : ''}`}
                  onClick={() => setFlipped(f => !f)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') setFlipped(f => !f);
                  }}
                >
                  <div className="font-bold text-green-800 mb-2">
                    {flipped
                      ? flashcards[currentFlashcard].answer
                      : flashcards[currentFlashcard].question}
                  </div>
                  <div className="text-gray-800 text-sm">
                    {flipped ? 'Answer (click to flip)' : 'Question (click to flip)'}
                  </div>
                </div>
                {flipped && (
                  <div className="mt-2 text-green-700 text-base">
                    <strong>Definition:</strong> {"No definition found."}
                  </div>
                )}
                <div className="flex gap-4 mt-4">
                  <button
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold transition-all duration-200 hover:bg-gray-300"
                    onClick={() => {
                      setCurrentFlashcard(i => Math.max(i - 1, 0));
                      setFlipped(false);
                    }}
                    disabled={currentFlashcard === 0}
                  >
                    Previous
                  </button>
                  <button
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold transition-all duration-200 hover:bg-gray-300"
                    onClick={() => {
                      setCurrentFlashcard(i => Math.min(i + 1, flashcards.length - 1));
                      setFlipped(false);
                    }}
                    disabled={currentFlashcard === flashcards.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            <button
              className="bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95"
              onClick={() => setMode('quiz')}
              disabled={flashcards.length === 0}
            >
              Start Quiz
            </button>
          </div>
        </div>
      )}
      {mode === 'quiz' && (
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 md:px-8">
          {quizCompleted ? (
            <div className="text-center my-8">
              <p className="text-3xl font-bold text-green-700 mb-4">Quiz Completed!</p>
              <p className="text-2xl mb-4">Your final score: {quizScore}</p>
              <button
                className="bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95"
                onClick={restartQuiz}
              >
                Restart Quiz
              </button>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-green-700 mb-4">Your score: {quizScore}</p>
              <QuizCard
                quizzesToShow={quizzesToShow}
                currentQuiz={currentQuiz}
                quizSetIndex={quizSetIndex}
                QUESTIONS_PER_SET={QUESTIONS_PER_SET}
                handleAnswer={handleAnswer}
                handleQuizPrev={handleQuizPrev}
                handleQuizNext={handleQuizNext}
              />
            </>
          )}
        </div>
      )}

      {/* Scanned Text Viewer (only once, outside of mode blocks) */}
      <div className="w-full max-w-xl mx-auto my-6">
        <h2 className="text-lg font-bold text-green-700 mb-2">Scanned Text</h2>
        <div
          className="bg-gray-50 border border-green-700 rounded-xl p-4 font-mono text-base text-gray-800 shadow-inner overflow-auto selectable-text"
          style={{ maxHeight: '300px', minHeight: '120px', whiteSpace: 'pre-wrap', userSelect: 'text' }}
          id="scannedTextBox"
        >
          {localScannedText || ocrText || "No text scanned yet."}
        </div>
        <button
          className="mt-4 bg-green-700 text-white px-5 py-2 rounded-lg font-semibold shadow transition-all duration-200 hover:bg-green-800 hover:scale-105 active:scale-95"
          onClick={() => {
            const selection = window.getSelection()
            const selectedText = selection ? selection.toString().trim() : ''
            if (selectedText) {
              generateFlashcards(selectedText)
              setMode('flashcards')
            } else {
              alert('Please highlight some text to generate flashcards.')
            }
          }}
        >
          Generate Flashcards from Selection
        </button>
      </div>

      {scanning && (
        <div className="flex flex-col items-center gap-4">
          <video
            ref={videoRef}
            autoPlay
            onCanPlay={handleVideoCanPlay}
            className="rounded-xl border border-green-700 shadow-lg w-full max-w-md"
          />
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          <div className="flex gap-4 mt-2">
            <button
              className="bg-green-700 text-white px-6 py-2 rounded-xl"
              onClick={startCountdown}
              disabled={countdown !== null || isOcrLoading}
            >
              {isOcrLoading ? "Scanning..." : "Capture"}
            </button>
            <button
              className="bg-red-600 text-white px-6 py-2 rounded-xl"
              onClick={stopCamera}
              disabled={isOcrLoading}
            >
              Stop Camera
            </button>
          </div>
          {cameraError && (
            <div className="text-red-600 font-semibold mt-2">{cameraError}</div>
          )}
          {countdown !== null && (
            <div className="text-3xl font-bold text-green-700 mb-2">Capturing in {countdown}...</div>
          )}
          {cameraTimeout && (
            <div className="text-red-600 font-semibold mt-2">Camera timed out. Please try again.</div>
          )}
        </div>
      )}

      {(isOcrLoading || timedOut /* || dictatedText === '' */) && (
        <Loader
          message={
            isOcrLoading
              ? `Reading text... ${Math.round(ocrProgress * 100)}%`
              : timedOut
              ? "Time's up! Showing the answer..."
              : "Listening for dictated text..."
          }
          progress={isOcrLoading ? ocrProgress : undefined}
        />
      )}

      {cameraError && (
        <div className="text-red-600 font-semibold mb-2">{cameraError}</div>
      )}
      {countdown !== null && (
        <div className="text-3xl font-bold text-green-700 mb-4">Capturing in {countdown}...</div>
      )}
      {cameraTimeout && (
        <div className="text-red-600 font-semibold mb-2">Camera timed out. Please try again.</div>
      )}
    </div>
  )
}

function QuizCard({
  quizzesToShow,
  currentQuiz,
  quizSetIndex,
  QUESTIONS_PER_SET,
  handleAnswer,
  handleQuizPrev,
  handleQuizNext
}: {
  quizzesToShow: Quiz[],
  currentQuiz: number,
  quizSetIndex: number,
  QUESTIONS_PER_SET: number,
  handleAnswer: (option: string) => void,
  handleQuizPrev: () => void,
  handleQuizNext: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const current = quizzesToShow[quizSetIndex * QUESTIONS_PER_SET + currentQuiz];

  if (!current) return <div>No quiz question available.</div>;

  const handleSelect = (option: string) => {
    if (showAnswer) return;
    setSelected(option);
    handleAnswer(option);
    setShowAnswer(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="text-xl font-semibold mb-4">
        Question {quizSetIndex * QUESTIONS_PER_SET + currentQuiz + 1}
      </div>
      <div className="text-lg mb-4">
        {current.question}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {current.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(option)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center
              ${selected === option ? (current.answer === option ? 'bg-green-700 text-white' : 'bg-red-600 text-white') : 'bg-gray-200 text-gray-700'}
              ${showAnswer && current.answer === option ? 'ring-2 ring-green-400' : ''}
              ${showAnswer && selected === option && current.answer !== option ? 'ring-2 ring-red-400' : ''}
            `}
            disabled={showAnswer}
          >
            {option}
          </button>
        ))}
      </div>
      {showAnswer && (
        <div className="mt-4 text-center">
          {current.answer === selected ? (
            <span className="text-green-700 font-semibold">Correct!</span>
          ) : (
            <span className="text-red-600 font-semibold">
              Incorrect! The correct answer is:{" "}
              <span className="font-bold">{current.answer}</span>
            </span>
          )}
        </div>
      )}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={handleQuizPrev}
          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:bg-gray-300"
        >
          Previous
        </button>
        <button
          onClick={handleQuizNext}
          className="flex-1 bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:bg-green-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}
export default HomePage;
