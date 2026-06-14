'use client'

import { useState } from 'react'
import type { EncadreP4, Dedicace } from '@/types'
import { TYPES_ENCADRES_P4 } from '@/lib/utils'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import RichTextarea from '@/components/ui/RichTextarea'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  encadres: EncadreP4[]
  dedicace: Dedicace
  onChange: (encadres: EncadreP4[]) => void
}

function SortableEncadre({
  enc, onUpdate, onRemove
}: {
  enc: EncadreP4
  onUpdate: (patch: Partial<EncadreP4>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: enc.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}
      className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
        <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </button>
        <input type="text" value={enc.titre}
          onChange={e => onUpdate({ titre: e.target.value })}
          className="flex-1 text-sm font-medium bg-transparent border-none outline-none text-gray-800"
          placeholder="Titre de l'encadré…" />
        <span className="text-xs text-gray-400 bg-gray-200 rounded px-2 py-0.5">
          {TYPES_ENCADRES_P4.find(t => t.value === enc.type)?.label}
        </span>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3">
        <RichTextarea
          value={enc.contenu}
          onChange={v => onUpdate({ contenu: v })}
          rows={5}
          placeholder="Contenu de l'encadré…"
        />
      </div>
    </div>
  )
}

export default function EncadresP4Form({ encadres, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor))

  function addEncadre(type: EncadreP4['type']) {
    const label = TYPES_ENCADRES_P4.find(t => t.value === type)?.label || type
    const newE: EncadreP4 = {
      id: crypto.randomUUID(),
      type,
      titre: label,
      contenu: '',
      ordre: encadres.length,
    }
    onChange([...encadres, newE])
  }

  function updateEncadre(id: string, patch: Partial<EncadreP4>) {
    onChange(encadres.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  function removeEncadre(id: string) {
    onChange(encadres.filter(e => e.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = encadres.findIndex(e => e.id === active.id)
      const newIndex = encadres.findIndex(e => e.id === over.id)
      onChange(arrayMove(encadres, oldIndex, newIndex))
    }
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={encadres.map(e => e.id)} strategy={verticalListSortingStrategy}>
          {encadres.map(enc => (
            <SortableEncadre
              key={enc.id}
              enc={enc}
              onUpdate={patch => updateEncadre(enc.id, patch)}
              onRemove={() => removeEncadre(enc.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {encadres.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Ajoutez des encadrés pour la page famille
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {TYPES_ENCADRES_P4.map(t => (
          <button key={t.value} onClick={() => addEncadre(t.value as EncadreP4['type'])}
            className="flex items-center gap-1 text-xs px-3 py-1.5 border border-dashed border-[#c9a84c] text-[#c9a84c] rounded-lg hover:bg-[#c9a84c]/5 transition">
            <Plus className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {encadres.length > 0 && (
        <p className="text-xs text-gray-400">
          {encadres.length <= 2 ? '1 colonne' : '2 colonnes'} — {encadres.length} encadré{encadres.length > 1 ? 's' : ''}. Glissez-déposez pour réordonner.
        </p>
      )}
    </div>
  )
}
