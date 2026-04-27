import { useEffect } from 'react'
import { MdClose, MdCheckCircle, MdError, MdWarning } from 'react-icons/md'

// Modal — center on desktop, bottom sheet on mobile
export function Modal({ title, children, onClose, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const sizeClass = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet — slides up on mobile, centered on desktop */}
      <div
        className={`
          relative bg-white w-full ${sizeClass}
          rounded-t-2xl sm:rounded-xl
          shadow-2xl flex flex-col
          max-h-[92vh] sm:max-h-[90vh]
          animate-sheet-up sm:animate-fade-scale
        `}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <MdClose size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}

// Spinner
export function Spinner({ size = 6 }) {
  return (
    <div className={`w-${size} h-${size} border-2 border-brand-800 border-t-transparent rounded-full animate-spin`} />
  )
}

// Toast
export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const config = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', Icon: MdCheckCircle, iconColor: 'text-green-500' },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', Icon: MdError, iconColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', Icon: MdWarning, iconColor: 'text-amber-500' },
  }
  const { bg, text, Icon, iconColor } = config[type]

  return (
    <div className={`fixed bottom-20 lg:bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bg} max-w-sm`}>
      <Icon className={iconColor} size={20} />
      <p className={`text-sm font-medium ${text}`}>{message}</p>
      <button onClick={onClose} className={`ml-2 ${text} opacity-60 hover:opacity-100`}><MdClose size={16} /></button>
    </div>
  )
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={48} className="text-gray-300 mb-4" />}
      <p className="text-gray-600 font-medium mb-1">{title}</p>
      {description && <p className="text-gray-400 text-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}

// Page header
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// Confirm dialog
export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <p className="text-gray-600 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
