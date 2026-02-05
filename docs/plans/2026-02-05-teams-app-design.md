# Teams App Design: ZEP Sync

**Datum:** 2026-02-05
**Status:** Genehmigt

## Übersicht

Integration der bestehenden ZEP Sync Anwendung als Microsoft Teams Tab-App für die organisationsweite Nutzung.

## Entscheidungen

| Aspekt | Entscheidung |
|--------|--------------|
| Deployment | Organisationsweite App via Teams Admin Center |
| Hosting | Bestehend: `https://zep.contiva.dev` |
| Authentifizierung | Teams SSO (automatischer Login) |
| UI | Bestehendes Dashboard 1:1 eingebettet |

## Architektur

```
┌─────────────────────────────────────────────────────┐
│  Microsoft Teams                                     │
│  ┌──────┐  ┌─────────────────────────────────────┐  │
│  │ App  │  │  iframe: zep.contiva.dev/dashboard  │  │
│  │ Icon │  │                                     │  │
│  │      │  │  ┌─────────────────────────────┐    │  │
│  │ ZEP  │  │  │  Bestehendes Dashboard      │    │  │
│  │ Sync │  │  │  (mit SSO eingeloggt)       │    │  │
│  │      │  │  └─────────────────────────────┘    │  │
│  └──────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## SSO-Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│  Teams   │────▶│ Teams SDK    │────▶│ Deine App       │
│  Client  │     │ getAuthToken │     │ /api/auth/teams │
└──────────┘     └──────────────┘     └─────────────────┘
                        │                      │
                        ▼                      ▼
                 Teams-Token            Token-Austausch
                 (begrenzte             gegen vollwertiges
                  Scopes)               Access-Token (OBO)
```

## Zu erstellende Dateien

### 1. Teams App Manifest

**Pfad:** `teams-app/manifest.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
  "manifestVersion": "1.17",
  "version": "1.0.0",
  "id": "{{AZURE_AD_CLIENT_ID}}",
  "packageName": "dev.contiva.zep",
  "name": {
    "short": "ZEP Sync",
    "full": "Outlook ZEP Synchronisation"
  },
  "description": {
    "short": "Outlook-Termine mit ZEP synchronisieren",
    "full": "Synchronisiere deine Outlook-Kalendertermine mit dem ZEP-Zeiterfassungssystem."
  },
  "developer": {
    "name": "Contiva",
    "websiteUrl": "https://zep.contiva.dev",
    "privacyUrl": "https://zep.contiva.dev/privacy",
    "termsOfUseUrl": "https://zep.contiva.dev/terms"
  },
  "icons": {
    "color": "color.png",
    "outline": "outline.png"
  },
  "accentColor": "#4F46E5",
  "staticTabs": [
    {
      "entityId": "dashboard",
      "name": "Dashboard",
      "contentUrl": "https://zep.contiva.dev/dashboard?inTeams=true",
      "scopes": ["personal"]
    }
  ],
  "permissions": ["identity"],
  "validDomains": ["zep.contiva.dev"],
  "webApplicationInfo": {
    "id": "{{AZURE_AD_CLIENT_ID}}",
    "resource": "api://zep.contiva.dev/{{AZURE_AD_CLIENT_ID}}"
  }
}
```

### 2. App Icons

**Pfade:**
- `teams-app/color.png` - 192x192 Pixel, farbiges Icon
- `teams-app/outline.png` - 32x32 Pixel, transparenter Hintergrund, weiße Linien

### 3. Teams SSO API Route

**Pfad:** `app/api/auth/teams-sso/route.ts`

Funktion:
- Empfängt Teams-Token vom Client
- Führt OAuth2 On-Behalf-Of (OBO) Flow durch
- Tauscht Teams-Token gegen Access-Token mit vollen Scopes
- Erstellt NextAuth-Session

### 4. Teams SDK Helper

**Pfad:** `lib/teams-sdk.ts`

Funktion:
- Lädt Microsoft Teams JavaScript SDK
- Initialisiert SDK wenn in Teams-Kontext
- Holt SSO-Token via `authentication.getAuthToken()`

### 5. Dashboard Anpassung

**Pfad:** `app/dashboard/page.tsx`

Änderung:
- Prüft URL-Parameter `?inTeams=true`
- Wenn in Teams: Ruft Teams SSO auf statt normaler Login-Seite
- Bestehende Funktionalität bleibt unverändert

## Azure AD Konfiguration

### Bestehende App-Registrierung erweitern

1. **Application ID URI setzen:**
   ```
   api://zep.contiva.dev/{client-id}
   ```

2. **API-Scope hinzufügen:**
   - Scope Name: `access_as_user`
   - Vollständiger Name: `api://zep.contiva.dev/{client-id}/access_as_user`
   - Admin consent: Nein
   - Beschreibung: "Access ZEP Sync as the signed-in user"

3. **Autorisierte Client-Anwendungen:**
   - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams Desktop/Mobile)
   - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams Web)
   - Beide für Scope `access_as_user` autorisieren

4. **Redirect URI hinzufügen:**
   ```
   https://zep.contiva.dev/auth/teams-callback
   ```

## Bereitstellung

### App-Paket erstellen

```bash
cd teams-app
zip -r ../zep-sync-teams.zip manifest.json color.png outline.png
```

### Im Teams Admin Center hochladen

1. Gehe zu: `admin.teams.microsoft.com`
2. Teams apps → Manage apps → Upload new app
3. ZIP-Datei hochladen
4. App für Organisation freigeben (Setup policies)

### Benutzer-Installation

1. In Teams auf "..." (Apps) klicken
2. "ZEP Sync" suchen
3. App hinzufügen
4. App erscheint in linker Seitenleiste

## Implementierungsreihenfolge

1. Azure AD Konfiguration anpassen
2. Teams SDK Helper erstellen (`lib/teams-sdk.ts`)
3. SSO API Route erstellen (`app/api/auth/teams-sso/route.ts`)
4. Dashboard für Teams-Kontext anpassen
5. App Icons erstellen
6. Manifest erstellen und anpassen
7. Lokal testen mit Teams Developer Portal
8. App-Paket erstellen und deployen
9. Im Teams Admin Center hochladen

## Abhängigkeiten

Neue npm-Pakete:
- `@microsoft/teams-js` - Teams JavaScript SDK

## Nicht im Scope

- Teams-spezifisches UI-Design
- Bot-Funktionalität
- Meeting-Extensions
- Benachrichtigungen/Notifications
