# 🎯 TikTok-Style Empfehlungsalgorithmus - Setup Anleitung

## Überblick

Dieses System implementiert einen **TikTok-ähnlichen Empfehlungsalgorithmus** für Immobilien, der:

1. **User-Interaktionen trackt** (Views, Favoriten, Suchverlauf)
2. **User-Präferenzen analysiert** (bevorzugte Locations, Preisrange, Features)
3. **Personalisierte Feeds generiert** (sortiert nach Match-Score)
4. **Kontinuierlich lernt** (je mehr der User interagiert, desto besser die Empfehlungen)

## 📋 Was wurde implementiert?

### 1. Datenbank-Schema

**Neue Tabellen:**
- `property_interactions` - Trackt alle User-Interaktionen (Views, Favoriten, etc.)
- `user_preferences` - Speichert aggregierte User-Präferenzen

**Neue Funktionen:**
- `calculate_user_preferences()` - Analysiert Interaktionen und aktualisiert Präferenzen
- `increment_property_views()` - Auto-Increment für Property-Views

### 2. API-Funktionen (`packages/api/src/recommendations.ts`)

**Interaction Tracking:**
- `trackInteraction()` - Trackt User-Interaktionen
- `getUserInteractions()` - Holt Interaktionshistorie

**User Preferences:**
- `updateUserPreferences()` - Aktualisiert User-Präferenzen
- `getUserPreferences()` - Holt User-Präferenzen

**Empfehlungs-Algorithmus:**
- `calculateMatchScore()` - Berechnet Match zwischen User und Property
- `getPersonalizedFeed()` - Generiert personalisierten Feed
- `getSimilarProperties()` - Findet ähnliche Properties
- `getTrendingProperties()` - Holt trending Properties

### 3. Frontend-Integration

**Property Detail Page:**
- ✅ Automatisches View-Tracking beim Seitenbesuch
- ✅ Dwell-Time-Tracking (Zeit auf der Seite)
- ✅ Automatische Präferenz-Updates nach View

**Favorite Button:**
- ✅ Tracking von Favorite/Unfavorite-Aktionen
- ✅ Automatische Präferenz-Updates nach Favorite

**Home Page:**
- ✅ Personalisierter Feed für eingeloggte User
- ✅ Fallback auf alle Properties für nicht-eingeloggte User
- ✅ Visuelle Anzeige "Für dich empfohlen"

## 🚀 Setup-Schritte

### Schritt 1: Migration anwenden

Du musst die Migration `007_recommendation_system.sql` auf deine Supabase-Datenbank anwenden:

**Option A: Mit Supabase CLI (empfohlen)**
```bash
npx supabase db push
```

**Option B: Manuell über Supabase Dashboard**
1. Gehe zu deinem Supabase-Dashboard
2. SQL Editor öffnen
3. Kopiere den Inhalt von `supabase/migrations/007_recommendation_system.sql`
4. Führe das SQL-Script aus

**Option C: Mit psql (falls verfügbar)**
```bash
PGPASSWORD='postgres' psql -h db.lntoolqtllivzdkhvvqf.supabase.co -p 5432 -U postgres -d postgres -f supabase/migrations/007_recommendation_system.sql
```

### Schritt 2: TypeScript-Typen generieren

Nach der Migration musst du die TypeScript-Typen neu generieren:

```bash
npm run db:types
```

### Schritt 3: App starten und testen

```bash
pnpm dev:web
```

## 🧪 Testen des Systems

### Test 1: Interaktions-Tracking

1. **Einloggen** als User
2. **Property-Detail-Seite besuchen** → View wird automatisch getrackt
3. **Property favorisieren** → Favorite-Interaktion wird getrackt
4. **Mehrere Properties ansehen** um Daten zu sammeln

### Test 2: Präferenz-Generierung

Nach einigen Interaktionen:

```typescript
// In der Browser-Console ausführen
const prefs = await fetch('/api/recommendations/preferences')
console.log(prefs)
```

Du solltest sehen:
- `preferred_locations` - Die Orte, die du am meisten angeschaut hast
- `price_range` - Dein bevorzugter Preisbereich
- `preferred_rooms` - Bevorzugte Zimmeranzahl
- `preferred_features` - Features, die du bevorzugst

### Test 3: Personalisierter Feed

1. **Home Page besuchen** als eingeloggter User
2. Du siehst "**Für dich empfohlen**" statt "Alle Immobilien"
3. Die Properties sind sortiert nach Match-Score
4. Je mehr du interagierst, desto besser werden die Empfehlungen

## 📊 Wie funktioniert der Algorithmus?

### Matching-Score (0-100 Punkte)

Der Algorithmus berechnet einen Match-Score basierend auf:

| Faktor | Gewicht | Beschreibung |
|--------|---------|--------------|
| **Location Match** | 30% | Wie oft hast du Properties in dieser Location angeschaut? |
| **Price Match** | 25% | Passt der Preis zu deinem bevorzugten Bereich? |
| **Features Match** | 20% | Hat die Property Features, die du magst? |
| **Rooms Match** | 15% | Passt die Zimmeranzahl zu deinen Präferenzen? |
| **AI Score** | 10% | Nutzt die vorhandene AI-Bewertung |

### Diversity-Balancing

Um Monotonie zu vermeiden:
- **Max. 20% der Empfehlungen** aus der gleichen Location
- **10% Exploration** - Zufällige Properties für Entdeckung
- **Diversity Factor** (0.3) - Balance zwischen Relevanz und Vielfalt

### Kontinuierliches Lernen

Das System lernt kontinuierlich:
1. **Jede Interaktion** wird getrackt
2. **User-Präferenzen** werden automatisch aktualisiert
3. **Match-Scores** werden neu berechnet
4. **Feed** wird personalisiert

## 🔧 Anpassungen und Optimierungen

### Gewichtung anpassen

In `packages/api/src/recommendations.ts`:

```typescript
const weights = {
  location: 0.3,  // 30% - erhöhe für mehr Location-Fokus
  price: 0.25,    // 25% - erhöhe für mehr Preis-Fokus
  rooms: 0.15,    // 15%
  features: 0.2,  // 20%
  similarity: 0.1 // 10%
};
```

### Diversity-Factor anpassen

In `apps/web/app/page.tsx`:

```typescript
const personalizedResults = await getPersonalizedFeed(user.id, {
  limit: 50,
  excludeViewed: false,      // true = zeige nur neue Properties
  diversityFactor: 0.3,      // 0.0 = max Relevanz, 1.0 = max Diversity
});
```

### Präferenz-Update Trigger

User-Präferenzen werden automatisch aktualisiert nach:
- ✅ Property View
- ✅ Property Favorite
- ✅ AI-Suche

Du kannst auch manuell triggern:

```typescript
await updateUserPreferences(userId);
```

## 📈 Performance-Optimierungen

1. **Indexe** sind bereits auf allen wichtigen Feldern gesetzt
2. **Batch-Updates** für Präferenzen (nicht nach jedem View)
3. **Caching** könnte implementiert werden:
   - Cache User-Präferenzen für 5 Minuten
   - Cache Personalized-Feed für 1 Minute

## 🎓 Nächste Schritte

### Erweiterungen:
1. **A/B Testing** - Teste verschiedene Gewichtungen
2. **Similar Properties** - "Ähnliche Immobilien" Section
3. **Trending Properties** - "Aktuell beliebt" Section
4. **Negative Signals** - Properties, die User überspringt
5. **Time Decay** - Ältere Interaktionen werden weniger gewichtet
6. **Collaborative Filtering** - "Nutzer wie du haben auch angeschaut..."

### Analytics:
1. **Click-Through-Rate** messen
2. **Dwell-Time** analysieren
3. **Conversion-Rate** tracken (Booking/Kontakt)
4. **A/B Tests** für verschiedene Algorithmen

## ❓ Troubleshooting

### Problem: TypeScript-Fehler bei Typen

**Lösung:**
```bash
npm run db:types
```

### Problem: Migration schlägt fehl

**Lösung:**
- Überprüfe, ob alle vorherigen Migrationen angewendet wurden
- Checke die Supabase-Logs im Dashboard

### Problem: Keine personalisierten Empfehlungen

**Lösung:**
- User muss eingeloggt sein
- User muss mindestens 3-5 Properties angeschaut/favorisiert haben
- `calculate_user_preferences(user_id)` manuell aufrufen

### Problem: Tracking funktioniert nicht

**Lösung:**
- Überprüfe Browser-Console auf Fehler
- Stelle sicher, dass User eingeloggt ist
- Überprüfe RLS-Policies in Supabase

## 📝 Zusammenfassung

Das **TikTok-Style Empfehlungssystem** ist jetzt voll implementiert und bereit für den Einsatz! 🎉

**Was passiert automatisch:**
- ✅ Tracking von Views, Favoriten
- ✅ Präferenz-Updates nach Interaktionen
- ✅ Personalisierte Feeds für eingeloggte User
- ✅ Kontinuierliches Lernen

**Was du tun musst:**
- ⚠️ Migration anwenden (siehe oben)
- ✅ Testen mit echten User-Interaktionen
- ✅ Algorithmus bei Bedarf anpassen

Viel Erfolg! 🚀
