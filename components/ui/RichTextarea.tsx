'use client'

import { useRef } from 'react'
import { Bold, Italic } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  className?: string
}

export default function RichTextarea({ value, onChange, rows = 6, placeholder, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function wrap(marker: string) {
    const el = ref.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)

    let newText: string
    let newStart: number
    let newEnd: number

    if (selected) {
      // Entourer la sélection
      newText = value.slice(0, start) + marker + selected + marker + value.slice(end)
      newStart = start + marker.length
      newEnd = end + marker.length
    } else {
      // Insérer les marqueurs et placer le curseur au milieu
      newText = value.slice(0, start) + marker + marker + value.slice(end)
      newStart = start + marker.length
      newEnd = newStart
    }

    onChange(newText)

    // Restaurer la sélection après mise à jour
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newStart, newEnd)
    })
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#2e6da4] focus-within:border-[#2e6da4]">
      {/* Barre d'outils */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); wrap('**') }}
          title="Gras (Cmd+B)"
          className="p-1 rounded hover:bg-gray-200 transition text-gray-600"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); wrap('*') }}
          title="Italique (Cmd+I)"
          className="p-1 rounded hover:bg-gray-200 transition text-gray-600"
        >
          <Italic className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 ml-2">
          Sélectionner du texte puis cliquer, ou utiliser <kbd className="bg-gray-200 px-1 rounded text-xs">**gras**</kbd> <kbd className="bg-gray-200 px-1 rounded text-xs">*italique*</kbd>
        </span>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm focus:outline-none resize-y font-serif leading-relaxed ${className || ''}`}
      />
    </div>
  )
}
