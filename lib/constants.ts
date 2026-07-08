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

// Multi-term search map: each category maps to the search terms an experienced
// salesperson would actually type into Google Maps to find these businesses.
// Categories not in this map (custom user categories) use their name as the single term.
export const BRANCH_SEARCH_MAP: Record<string, string[]> = {
  'Immobilien/Makler':        ['Immobilienmakler', 'Immobilienbüro', 'Hausverwaltung', 'Liegenschaftsverwaltung'],
  'Real Estate':              ['Real Estate Agency', 'Property Management', 'Immobilien International'],
  'Bauträger':                ['Bauträger', 'Wohnbaugesellschaft', 'Immobilienentwickler', 'Projektentwicklung Bau'],
  'Developer':                ['Immobilien Developer', 'Projektentwicklung', 'Bauträger Wohnen'],
  'Projektentwicklung':       ['Projektentwicklung Immobilien', 'Bauträger', 'Immobilienentwicklung'],
  'Hotels':                   ['Hotel', 'Boutique Hotel', 'Wellness Hotel', 'Resort'],
  'Events/Eventlocations':    ['Eventlocation', 'Veranstaltungssaal', 'Hochzeitslocation', 'Seminarhotel'],
  'Vermietung':               ['Ferienwohnung Vermietung', 'Apartmentvermietung', 'Kurzzeitvermietung'],
  'Gastronomie':              ['Restaurant', 'Gasthof', 'Bistro', 'Wirtshaus'],
  'Wellness/Spa':             ['Wellnesshotel', 'Spa', 'Therme', 'Beauty Salon'],
  'Architekten':              ['Architekturbüro', 'Planungsbüro', 'Innenarchitekt'],
  'IT/Software':              ['IT Unternehmen', 'Softwareentwicklung', 'Digitalagentur', 'IT Beratung'],
  'Finanzen/Versicherung':    ['Finanzberatung', 'Versicherungsmakler', 'Steuerberater', 'Vermögensverwaltung'],
  'Gesundheit/Pflege':        ['Arztpraxis', 'Zahnarzt', 'Pflegeheim', 'Physiotherapie'],
  'Handel':                   ['Einzelhandel', 'Fachhandel', 'Modegeschäft', 'Einrichtungshaus'],
  'Logistik':                 ['Spedition', 'Logistik', 'Transportfirma', 'Kurierdienst'],
  // Legacy label aliases (older stored searches / BRANCHES list with spaces)
  'Immobilien / Makler':         ['Immobilienmakler', 'Immobilienbüro', 'Hausverwaltung', 'Liegenschaftsverwaltung'],
  'Events / Eventlocations':     ['Eventlocation', 'Veranstaltungssaal', 'Hochzeitslocation', 'Seminarhotel'],
  'Developer / Projektentwicklung': ['Immobilien Developer', 'Projektentwicklung', 'Bauträger Wohnen'],
}
