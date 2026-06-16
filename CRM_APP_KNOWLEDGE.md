# Lukas Aigner CRM — App Knowledge File
> Updated: 2026-06-15 | Version: v4.0 (Next.js Rebuild)
> This file is a living reference for future AI sessions. Update whenever major changes are made.

---

## 1. Projekt-Übersicht

**App-Name:** Lukas Aigner CRM  
**Kurzform:** LA CRM  
**URL (Produktion):** https://lukas-aigner-crm.vercel.app *(nach Rename)*  
**GitHub Repo:** https://github.com/aigluk/lukas-aigner-crm *(nach Rename)*  
**Deployment:** Vercel (auto-deploy via GitHub main branch push)  
**Stack:** Next.js 15 App Router + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL + Auth) + Vercel

---

## 2. Dateistruktur

```
/
├── app/
│   ├── (auth)/login/           ← Login-Screen (Supabase Auth)
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← Sidebar + MobileNav Layout
│   │   ├── page.tsx            ← Dashboard (KPIs + Activity Feed)
│   │   ├── leads/page.tsx      ← Pipeline + Tabelle + Detail Modal
│   │   ├── calendar/page.tsx   ← Tag/Woche/Monat Kalender
│   │   ├── reports/page.tsx    ← Analytics + Charts
│   │   └── generator/page.tsx  ← Lead Generator (Outscraper)
│   ├── api/
│   │   ├── leads/route.ts      ← GET/POST/PATCH/DELETE Leads (Supabase)
│   │   ├── generate/route.ts   ← Lead-Generierung via Outscraper
│   │   └── generate-message/route.ts ← LinkedIn-DM via Claude AI
│   ├── globals.css             ← Tailwind v4 @theme + global styles
│   └── layout.tsx              ← Root Layout (Inter Font, Metadata)
├── components/
│   ├── Logo.tsx                ← SVG Logo (currentColor)
│   ├── layout/
│   │   ├── Sidebar.tsx         ← Desktop Sidebar (220px)
│   │   └── MobileNav.tsx       ← Mobile Bottom Nav
│   ├── dashboard/
│   │   ├── KPICards.tsx        ← 6 KPI-Karten
│   │   └── ActivityFeed.tsx    ← Letzte Aktivitäten
│   ├── leads/
│   │   ├── LeadsView.tsx       ← Client-Komponente (State, Filter, CRUD)
│   │   ├── PipelineTabs.tsx    ← Status-Tabs mit Count-Badges
│   │   ├── LeadTable.tsx       ← Lead-Tabelle (responsive)
│   │   └── LeadDetailModal.tsx ← Detail + Edit Modal
│   ├── calendar/
│   │   └── CalendarView.tsx    ← Tag/Woche/Monat Views
│   ├── reports/
│   │   └── ReportsView.tsx     ← Donut Charts + Bar Chart
│   └── generator/
│       └── GeneratorForm.tsx   ← Generator UI + Ergebnisliste
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← Browser Supabase Client
│   │   └── server.ts           ← Server Supabase Client (SSR)
│   ├── types.ts                ← Lead, LeadStatus, LeadUpdate Typen
│   ├── constants.ts            ← STATUSES, STATUS_COLORS, BRANCHES
│   └── utils.ts                ← normalizeStatus, formatDate, cn, etc.
├── supabase/
│   ├── schema.sql              ← DB Schema (einmalig ausführen)
│   └── migrate-from-kv.mjs    ← Datenmigration von altem Vercel KV
├── middleware.ts               ← Supabase Auth Guard
├── next.config.ts
├── tailwind.config (in globals.css via @theme)
└── CRM_APP_KNOWLEDGE.md        ← DIESE DATEI
```

---

## 3. Authentifizierung

- **Provider:** Supabase Auth (Email + Password)
- **Setup:** Einen User im Supabase Dashboard anlegen (Authentication → Users)
- **Schutz:** `middleware.ts` leitet nicht-authentifizierte Requests auf `/login` um
- **Logout:** Supabase `signOut()` in Sidebar

---

## 4. Datenstruktur (Leads in Supabase)

Tabelle: `public.leads` — vollständiges Schema in `supabase/schema.sql`

**Wichtige Felder:**
```typescript
{
  id: uuid (auto)
  user_id: uuid (FK auth.users)
  name: string               // Unternehmensname
  ceos: string               // Ansprechpartner / Geschäftsführer
  branche: string            // Branche (normalisiert)
  region: string             // Adresse / Region
  city: string               // Stadt
  phone: string
  email: string              // Haupt-Email
  email_general: string      // info@, office@
  email_ceo: string          // CEO-Email
  website: string
  status: LeadStatus         // normalisiert (s. Abschnitt 5)
  status_date: timestamptz   // Datum der letzten Statusänderung
  note: string               // Deal Note
  notes: string              // Notizen
  appointment_date: string   // Termin-Datum
  appointment_from: string   // Von-Zeit
  appointment_to: string     // Bis-Zeit
}
```

---

## 5. CRM Status-Pipeline

| Status | Bedeutung | Farbe |
|---|---|---|
| `NEU` | Frischer Lead | Weiß |
| `IN KONTAKT` | Kontakt aufgenommen | Blau (#60A5FA) |
| `TERMIN FIXIERT` | Termin vereinbart | Rot (#FF5252) |
| `ABSCHLUSS / ABSAGE` | Deal gewonnen oder verloren | Mint (#B9FBC0) |
| `KEIN INTERESSE` | Abgelehnt | Grau |
| `BESTANDSKUNDE` | Aktiver Kunde | Gelb (#FBBF24) |
| `NO GO` | Blacklist | Dunkelgrau |

Normalisierung via `lib/utils.ts → normalizeStatus()`

---

## 6. API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/api/leads` | GET | Alle Leads laden (Supabase) |
| `/api/leads` | POST | Leads einfügen (Batch oder Single, Merge-Logik) |
| `/api/leads` | PATCH | Lead aktualisieren (id + fields) |
| `/api/leads` | DELETE | Lead löschen (?id=uuid) |
| `/api/generate` | POST | Leads via Outscraper + Firmenbuch generieren |
| `/api/generate-message` | POST | LinkedIn-DM via Claude AI (claude-haiku-4-5) |

---

## 7. CI-Design

**Primärfarbe:** `#FF5252` (Coral Red — Accent)  
**Sekundärfarbe:** `#B9FBC0` (Mint Green — Success)  
**Background:** `#1A1A1A` (Deep Black)  
**Surface:** `#222222` (Panel / Karten)  
**Font:** Inter (Google Fonts via next/font)  
**Icons:** Lucide React  
**Logo:** Geometrisches "S" Lightning-Bolt SVG (`currentColor` → weiß auf dunkel)

Tailwind v4 Theme-Tokens (in `app/globals.css`):
- `accent` → #FF5252
- `accent-green` → #B9FBC0  
- `dark` → #1A1A1A
- `panel` → #222222
- `panel-hover` → #2C2C2C
- `rim` → #383838
- `rim-subtle` → #2A2A2A

---

## 8. Vercel Environment Variables

| Variable | Beschreibung |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `OUTSCRAPER_API_KEY` | Outscraper für Lead-Generierung |
| `OPENDATA_HOST_API_KEY` | Firmenbuch Austria API |
| `APOLLO_API_KEY` | Apollo.io (Fallback CEO/Email) |
| `ANTHROPIC_API_KEY` | Claude API für LinkedIn-Nachrichten |

---

## 9. Setup-Anleitung (einmalig)

1. **Supabase Projekt erstellen** → `supabase/schema.sql` im SQL Editor ausführen
2. **Supabase User anlegen** → Authentication → Users → Add User
3. **Vercel Env Vars setzen** → SUPABASE_URL + SUPABASE_ANON_KEY
4. **Datenmigration** (optional) → `node supabase/migrate-from-kv.mjs`
5. **GitHub Push** → Vercel deployed automatisch

---

## 10. Bekannte technische Details

- **Middleware:** Schützt alle Routen außer `/login` und statischen Assets
- **RLS:** Row Level Security in Supabase — jeder User sieht nur seine eigenen Leads
- **Merge-Logik:** POST `/api/leads` merged Leads anhand Name+Website-Key, schützt user-gesetzte Status
- **normalizeStatus():** Immer verwenden — Leads können unterschiedliche Schreibweisen haben
- **Server Components:** Dashboard und Leads-Seiten laden Daten server-seitig (schnell, kein Flash)
- **Client Components:** LeadsView, CalendarView, GeneratorForm, Sidebar — brauchen User-Interaktion
- **Tailwind v4:** Konfiguration in `app/globals.css` via `@theme {}`, kein tailwind.config.ts

---

## 11. Änderungschronologie

| Datum | Änderung |
|---|---|
| 2026-04-03 | Initiales Setup: HTML-Monolith, Vercel KV, Outscraper |
| 2026-04-04 | Lead Import, statusDate, Calendar Fix |
| 2026-06-15 | **Vollständiger Rebuild:** Next.js 15 + Tailwind v4 + Supabase, CI-Redesign (LA Branding) |
