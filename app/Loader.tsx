// filepath: /Users/ishika/Documents/GitHub/TestFinal/app/Loader.tsx
export default function Loader({ message, progress }: { message?: string; progress?: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-green-700 font-bold text-xl mb-2">{message || "Loading..."}</div>
      {typeof progress === "number" && (
        <div className="w-full bg-green-100 rounded-full h-2.5 mb-4">
          <div className="bg-green-700 h-2.5 rounded-full" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}