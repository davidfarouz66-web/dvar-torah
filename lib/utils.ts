import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export const TYPES_RUBRIQUES_P1 = [
  { value: 'dvar_torah_court', label: 'Dvar Torah court' },
  { value: 'halakha', label: 'Halakha' },
  { value: 'paracha_resume', label: 'Paracha Hachavoua résumé' },
  { value: 'agenda', label: 'Agenda communautaire' },
  { value: 'pensee_rav', label: 'Pensée du Rav' },
  { value: 'annonces', label: 'Annonces diverses' },
] as const

export const TYPES_ENCADRES_P4 = [
  { value: 'quiz', label: 'Quiz sur la paracha' },
  { value: 'devinette', label: 'Devinette Torah' },
  { value: 'histoire', label: 'Histoire courte pour enfants' },
  { value: 'mots_meles', label: 'Mots mêlés' },
  { value: 'mot_semaine', label: 'Mot de la semaine' },
  { value: 'annonces', label: 'Annonces' },
] as const
