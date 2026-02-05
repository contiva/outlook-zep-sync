#!/bin/bash

# Teams App Package Builder
# Erstellt das ZIP-Paket für die Teams App-Bereitstellung

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Teams App Package Builder"
echo "========================="
echo ""

# Prüfe ob die Icons existieren
if [ ! -f "color.png" ]; then
    echo -e "${RED}Fehler: color.png nicht gefunden!${NC}"
    echo "Bitte erstelle ein 192x192 Pixel farbiges Icon."
    exit 1
fi

if [ ! -f "outline.png" ]; then
    echo -e "${RED}Fehler: outline.png nicht gefunden!${NC}"
    echo "Bitte erstelle ein 32x32 Pixel weißes Icon."
    exit 1
fi

# Prüfe ob manifest.json existiert
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}Fehler: manifest.json nicht gefunden!${NC}"
    exit 1
fi

# Prüfe ob die Client-ID ersetzt wurde
if grep -q "{{AZURE_AD_CLIENT_ID}}" manifest.json; then
    echo -e "${YELLOW}Warnung: {{AZURE_AD_CLIENT_ID}} wurde noch nicht ersetzt!${NC}"
    echo ""
    read -p "Azure AD Client-ID eingeben: " CLIENT_ID
    if [ -z "$CLIENT_ID" ]; then
        echo -e "${RED}Keine Client-ID eingegeben. Abbruch.${NC}"
        exit 1
    fi

    # Ersetze in einer temporären Datei
    sed "s/{{AZURE_AD_CLIENT_ID}}/$CLIENT_ID/g" manifest.json > manifest.json.tmp
    mv manifest.json.tmp manifest.json
    echo -e "${GREEN}Client-ID ersetzt.${NC}"
fi

# Lösche altes Paket falls vorhanden
rm -f ../zep-sync-teams.zip

# Erstelle das ZIP-Paket
echo ""
echo "Erstelle ZIP-Paket..."
zip -r ../zep-sync-teams.zip manifest.json color.png outline.png

echo ""
echo -e "${GREEN}Fertig!${NC}"
echo "Das Paket wurde erstellt: zep-sync-teams.zip"
echo ""
echo "Nächste Schritte:"
echo "1. Gehe zu: https://admin.teams.microsoft.com"
echo "2. Teams apps → Manage apps → Upload new app"
echo "3. Lade zep-sync-teams.zip hoch"
