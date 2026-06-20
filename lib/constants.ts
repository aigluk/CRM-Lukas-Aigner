import { LeadStatus } from './types'

export const STATUSES: LeadStatus[] = [
  'NEU',
  'VERKAUFSGESPRÄCH',
  'FOLLOW UP',
  'CLOSING CALL',
  'ABSCHLUSS',
  'KEIN INTERESSE',
  'NO GO',
]

export const STATUS_LABELS: Record<LeadStatus, string> = {
  'NEU':             'Neu',
  'VERKAUFSGESPRÄCH':'Verkaufsgespräch',
  'FOLLOW UP':       'Follow Up',
  'CLOSING CALL':    'Closing Call',
  'ABSCHLUSS':       'Abschluss',
  'KEIN INTERESSE':  'Kein Interesse',
  'NO GO':           'No Go',
}

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; dot: string }> = {
  'NEU':             { bg: 'bg-white/7',         text: 'text-white/45',     dot: 'bg-white/35'    },
  'VERKAUFSGESPRÄCH':{ bg: 'bg-accent/15',       text: 'text-accent',       dot: 'bg-accent'      },
  'FOLLOW UP':       { bg: 'bg-white/16',        text: 'text-white',        dot: 'bg-white'       },
  'CLOSING CALL':    { bg: 'bg-accent/20',       text: 'text-accent',       dot: 'bg-accent'      },
  'ABSCHLUSS':       { bg: 'bg-accent-green/15', text: 'text-accent-green', dot: 'bg-accent-green'},
  'KEIN INTERESSE':  { bg: 'bg-white/4',         text: 'text-white/22',     dot: 'bg-white/18'    },
  'NO GO':           { bg: 'bg-white/3',         text: 'text-white/12',     dot: 'bg-white/10'    },
}

export const BRANCHES = [
  'Immobilien / Makler',
  'Bauträger',
  'Architekten',
  'Developer / Projektentwicklung',
  'Hotels',
  'Gastronomie',
  'Events / Eventlocations',
  'Wellness/Spa',
  'IT/Software',
  'Finanzen/Versicherung',
  'Gesundheit/Pflege',
  'Handel',
  'Logistik',
]

export const BRANCH_SEARCH_MAP: Record<string, string> = {
  'Immobilien / Makler':         'Immobilienmakler',
  'Bauträger':                   'Bauträger Immobilien',
  'Architekten':                 'Architekturbüro',
  'Developer / Projektentwicklung': 'Projektentwicklung Immobilien',
  'Hotels':                      'Hotels',
  'Gastronomie':                 'Restaurants Gastronomie',
  'Events / Eventlocations':     'Eventlocation Veranstaltung',
  'Wellness/Spa':                'Wellness Spa',
  'IT/Software':                 'IT Software Unternehmen',
  'Finanzen/Versicherung':       'Finanzberatung Versicherung',
  'Gesundheit/Pflege':           'Arztpraxis Pflegeheim',
  'Handel':                      'Einzelhandel',
  'Logistik':                    'Logistik Spedition',
}
