# Teams App: ZEP Sync

## Vor der Bereitstellung

### 1. manifest.json anpassen

Ersetze `{{AZURE_AD_CLIENT_ID}}` mit deiner tatsächlichen Azure AD Client-ID:

```bash
# Beispiel mit sed (Linux/macOS)
sed -i '' 's/{{AZURE_AD_CLIENT_ID}}/deine-client-id-hier/g' manifest.json
```

Oder öffne die Datei und ersetze manuell alle Vorkommen von `{{AZURE_AD_CLIENT_ID}}`.

### 2. App Icons erstellen

Erstelle folgende Icons im `teams-app` Verzeichnis:

- **color.png**: 192x192 Pixel, farbiges Icon mit transparentem Hintergrund
- **outline.png**: 32x32 Pixel, weißes Icon mit transparentem Hintergrund

Du kannst das vorhandene Logo (`public/logo.png`) als Basis verwenden.

### 3. App-Paket erstellen

```bash
cd teams-app
zip -r ../zep-sync-teams.zip manifest.json color.png outline.png
```

## Bereitstellung im Teams Admin Center

1. Gehe zu: https://admin.teams.microsoft.com
2. Navigiere zu: Teams apps → Manage apps → Upload new app
3. Lade die `zep-sync-teams.zip` Datei hoch
4. Konfiguriere Setup policies um die App für alle/bestimmte Benutzer freizugeben

## Benutzer-Installation

1. In Teams auf "..." (Apps) in der linken Seitenleiste klicken
2. "ZEP Sync" suchen
3. App hinzufügen
4. Die App erscheint in der linken Seitenleiste

## Azure AD Voraussetzungen

Stelle sicher, dass folgende Konfigurationen in Azure AD vorgenommen wurden:

1. **Application ID URI**: `api://zep.contiva.dev/{client-id}`
2. **API-Scope**: `access_as_user`
3. **Autorisierte Client-Anwendungen**:
   - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams Desktop/Mobile)
   - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams Web)
4. **Redirect URI**: `https://zep.contiva.dev/auth/teams-callback`
