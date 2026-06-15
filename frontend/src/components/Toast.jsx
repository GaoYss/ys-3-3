import { X } from 'lucide-react'

export function Toast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="toast">
      <span className="toast-message">{message}</span>
      <button type="button" onClick={onClose} aria-label="关闭提示">
        <X size={16} />
      </button>
    </div>
  )
}
