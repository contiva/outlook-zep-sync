# Outlook → ZEP Sync

Eine Web-Anwendung zum Übertragen von Outlook-Terminen zur ZEP Zeiterfassung.

## Features

- Microsoft OAuth2 Login für sicheren Kalender-Zugriff
- Datumsbereich-Auswahl für Termine
- Projektzuordnung für jeden Termin
- Batch-Übertragung zu ZEP

## Setup

### 1. Azure App Registration

1. Gehe zu [Azure Portal](https://portal.azure.com) → Microsoft Entra ID → App registrations
2. Neue Registrierung erstellen:
   - Name: `Outlook ZEP Sync`
   - Supported account types: Single tenant (oder Multi-tenant)
3. Redirect URI hinzufügen:
   - Platform: Web
   - URI: `http://localhost:3000/api/auth/callback/azure-ad`
4. API Permissions hinzufügen:
   - `Microsoft Graph` → `User.Read` (Delegated)
   - `Microsoft Graph` → `Calendars.Read` (Delegated)
   - Admin consent erteilen
5. Client Secret erstellen:
   - Certificates & secrets → New client secret
   - Wert kopieren (wird nur einmal angezeigt!)

### 2. Environment Variables

Kopiere `.env.local.example` zu `.env.local` und fülle die Werte aus:

```env
AZURE_AD_CLIENT_ID=deine-application-client-id
AZURE_AD_CLIENT_SECRET=dein-client-secret
AZURE_AD_TENANT_ID=dein-tenant-id

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ein-langes-zufaelliges-secret-min-32-zeichen
```

**NEXTAUTH_SECRET generieren:**

```bash
openssl rand -base64 32
```

### 3. Installation & Start

```bash
cd outlook-zep-sync
pnpm install
pnpm dev
```

Öffne http://localhost:3000

## Verwendung

1. **Microsoft Login** - Klicke auf "Mit Microsoft anmelden"
2. **ZEP Verbindung** - Gib deine ZEP URL und deinen API-Token ein
   - ZEP URL: z.B. `https://deine-firma.zep.de`
   - API Token: In ZEP unter Einstellungen → API-Zugang generieren
3. **Termine laden** - Wähle Datumsbereich und klicke "Termine laden"
4. **Projektzuordnung** - Wähle für jeden Termin das passende ZEP-Projekt
5. **Übertragen** - Klicke "An ZEP übertragen"

## Projektstruktur

```
outlook-zep-sync/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth Handler
│   │   ├── calendar/            # Outlook Kalender API
│   │   └── zep/                 # ZEP API (projects, timeentries)
│   ├── dashboard/               # Hauptansicht
│   ├── layout.tsx
│   └── page.tsx                 # Login
├── components/
│   ├── AppointmentList.tsx
│   ├── AppointmentRow.tsx
│   ├── DateRangePicker.tsx
│   ├── LoginForm.tsx
│   └── Providers.tsx
├── lib/
│   ├── auth.ts                  # NextAuth Konfiguration
│   ├── microsoft-graph.ts       # Graph API Client
│   └── zep-api.ts               # ZEP API Client
└── types/
    └── next-auth.d.ts           # Session Typen
```

## Tech Stack

- **Next.js 16** - React Framework
- **NextAuth.js** - OAuth2 Authentifizierung
- **Tailwind CSS** - Styling
- **Microsoft Graph API** - Outlook Kalender
- **ZEP REST API** - Zeiterfassung

## Troubleshooting

### "Unauthorized" beim Laden der Termine

- Prüfe ob die Azure App die Berechtigung `Calendars.Read` hat
- Lösche Cookies und melde dich neu an

### ZEP-Projekte werden nicht geladen

- Prüfe ob die ZEP URL korrekt ist (mit https://)
- Prüfe ob der API-Token gültig ist

### "Failed to fetch" Fehler

- Prüfe die Netzwerkverbindung
- Prüfe die Browser-Konsole für Details
