# 🚀 Schnell-Setup für das Empfehlungssystem

## ⚠️ Wichtig: Diese Schritte MÜSSEN ausgeführt werden!

Das Empfehlungssystem ist vollständig implementiert, aber die Datenbank-Migration muss noch angewendet werden.

## Schritt-für-Schritt Anleitung

### 1️⃣ Migration auf Supabase anwenden

**Option A: Über Supabase Dashboard (am einfachsten)**

1. Gehe zu https://supabase.com/dashboard
2. Wähle dein Projekt "lntoolqtllivzdkhvvqf"
3. Klicke auf "SQL Editor" in der linken Sidebar
4. Erstelle eine "New query"
5. Kopiere den GESAMTEN Inhalt von `supabase/migrations/007_recommendation_system.sql`
6. Füge ihn ein und klicke auf "Run"
7. Überprüfe, ob die Ausführung erfolgreich war (grüner Haken)

**Option B: Mit Supabase CLI**

```bash
# Falls Supabase CLI installiert ist
npx supabase db push
```

### 2️⃣ TypeScript-Typen neu generieren

Nach der Migration MUSST du die TypeScript-Typen neu generieren:

```bash
npm run db:types
```

Dieser Befehl holt die neuen Tabellen-Definitionen von Supabase und generiert TypeScript-Typen.

### 3️⃣ App starten

```bash
pnpm dev:web
```

### 4️⃣ Testen

1. **Einloggen** auf http://localhost:3000
2. **Mehrere Properties ansehen** (mindestens 5)
3. **Einige favorisieren**
4. **Zurück zur Startseite** → Du siehst jetzt "Für dich empfohlen" 🎉

## ✅ Erfolgskontrolle

Nach dem Setup solltest du:

1. **Keine TypeScript-Fehler** mehr sehen
2. **Home Page zeigt** "Für dich empfohlen" für eingeloggte User
3. **Properties werden getrackt** (check in Browser Console)
4. **Personalisierte Empfehlungen** nach einigen Interaktionen sehen

## 🔍 Fehlersuche

### Problem: "table property_interactions does not exist"

→ **Migration wurde nicht angewendet**. Gehe zurück zu Schritt 1.

### Problem: TypeScript-Fehler nach Migration

→ **Typen nicht neu generiert**. Führe aus:
```bash
npm run db:types
```

### Problem: "Für dich empfohlen" erscheint nicht

→ **User ist nicht eingeloggt** ODER **hat noch keine Interaktionen**. Schaue dir mindestens 5 Properties an.

## 📊 Wie es funktioniert

Sobald du als eingeloggter User die App nutzt:

1. **Jeder Property-View** wird automatisch getrackt
2. **Jedes Favorite** wird automatisch getrackt
3. **Deine Präferenzen** werden automatisch aktualisiert
4. **Der Feed** wird personalisiert basierend auf:
   - Locations, die du bevorzugst
   - Preisspanne, die du interessant findest
   - Features, die du magst
   - Zimmeranzahl, die du suchst

Je mehr du die App nutzt, desto besser werden die Empfehlungen! 🎯

## 📖 Weitere Infos

Siehe `RECOMMENDATION_SYSTEM_SETUP.md` für:
- Detaillierte Algorithmus-Erklärung
- Anpassungsmöglichkeiten
- Performance-Tipps
- Erweiterungsideen
