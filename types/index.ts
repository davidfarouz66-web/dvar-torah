export interface Organisation {
  id: string
  nom: string
  nom_feuillet: string
  logo_url: string | null
  couleur_principale: string
  couleur_secondaire: string
  couleur_fond: string
  signataire_defaut: string
  numero_depart: number
  created_at: string
}

export interface Utilisateur {
  id: string
  email: string
  organisation_id: string
  role: 'super_admin' | 'admin' | 'redacteur'
  nom: string
  created_at: string
}

export interface RochHodech {
  actif: boolean
  nom_mois: string
  jours: string
  nolad: string
}

export interface RubriqueP1 {
  id: string
  type: 'dvar_torah_court' | 'halakha' | 'paracha_resume' | 'agenda' | 'pensee_rav' | 'annonces'
  actif: boolean
  titre: string
  contenu: string
}

export interface EncadreP4 {
  id: string
  type: 'quiz' | 'devinette' | 'histoire' | 'mots_meles' | 'mot_semaine' | 'annonces'
  titre: string
  contenu: string
  ordre: number
}

export interface DvarTorah {
  verset_hebreu: string
  traduction: string
  developpement: string
  signataire: string
}

export interface Dedicace {
  actif: boolean
  texte: string
  placement: 'page1' | 'page4'
}

export interface Feuillet {
  id: string
  organisation_id: string
  numero: number
  paracha_fr: string
  paracha_he: string
  date_shabbat: string
  heure_entree: string
  heure_sortie: string
  roch_hodech: RochHodech
  rubriques_p1: RubriqueP1[]
  dvar_torah: DvarTorah
  dedicace: Dedicace
  encadres_p4: EncadreP4[]
  statut: 'brouillon' | 'publie'
  created_at: string
  updated_at: string
}
