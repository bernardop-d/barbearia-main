// src/components/ErrorMessage.jsx
export default function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm" role="alert">
      {message}
    </div>
  )
}
