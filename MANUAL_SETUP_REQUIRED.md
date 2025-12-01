# ⚠️ MANUELLE SCHRITTE ERFORDERLICH

## Problem identifiziert

Die **Row Level Security (RLS)** Policy blockiert:
1. ❌ Einfügen neuer Properties
2. ❌ Laden von Properties in der App

## 🔧 Lösung: SQL im Supabase Dashboard ausführen

### Schritt 1: Öffne Supabase SQL Editor

1. Gehe zu: https://supabase.com/dashboard/project/lntoolqtllivzdkhvvqf/sql/new
2. Erstelle eine neue Query
3. Kopiere und füge das folgende SQL ein:

```sql
-- =====================================================
-- FIX RLS POLICIES + SEED TEST DATA
-- =====================================================

-- 1. RLS Policy für Properties SELECT (READ) - ALLE können lesen
DROP POLICY IF EXISTS "Anyone can view active properties" ON properties;
CREATE POLICY "Anyone can view active properties"
  ON properties FOR SELECT
  USING (status = 'active');

-- 2. RLS Policy für Properties INSERT - JEDER authentifizierte User kann einfügen
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON properties;
CREATE POLICY "Authenticated users can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Test-Properties einfügen
INSERT INTO properties (
  title,
  description,
  location,
  address,
  price,
  sqm,
  rooms,
  features,
  images,
  highlights,
  red_flags,
  ai_investment_score,
  score_color,
  yield,
  status,
  user_id
) VALUES
-- Property 1: München
(
  'Moderne 3-Zimmer Wohnung in München Schwabing',
  'Helle 3-Zimmer-Wohnung in bester Lage von Schwabing. Renoviert 2022, Balkon mit Südausrichtung, hochwertige Einbauküche, Eichenparkett.',
  'München Schwabing',
  'Leopoldstraße 45, 80802 München',
  650000,
  85,
  3,
  ARRAY['Balkon', 'Einbauküche', 'Parkett', 'Renoviert', 'Aufzug'],
  ARRAY[
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
  ],
  ARRAY['Top Lage Schwabing', 'Renoviert 2022', 'Balkon Südseite'],
  ARRAY['Kein Stellplatz', 'Altbau'],
  87,
  'green',
  3.2,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
-- Property 2: Berlin
(
  'Traumhafte 2-Zimmer Wohnung in Berlin Prenzlauer Berg',
  'Wunderschöne Altbauwohnung mit hohen Decken. Komplett saniert, moderne Küche, Badewanne.',
  'Berlin Prenzlauer Berg',
  'Kollwitzstraße 12, 10405 Berlin',
  420000,
  68,
  2,
  ARRAY['Altbau', 'Hohe Decken', 'Einbauküche', 'Badewanne'],
  ARRAY[
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800'
  ],
  ARRAY['Prenzlauer Berg Top-Lage', 'Saniert', 'Hohe Altbaudecken'],
  ARRAY['Kein Aufzug (3. OG)'],
  75,
  'yellow',
  3.8,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
-- Property 3: Hamburg
(
  'Exklusive 4-Zimmer Maisonette in Hamburg Eppendorf',
  'Traumhafte Maisonette-Wohnung über 2 Etagen. 2 Bäder, Dachterrasse, Premium-Ausstattung.',
  'Hamburg Eppendorf',
  'Eppendorfer Landstraße 88, 20249 Hamburg',
  890000,
  125,
  4,
  ARRAY['Maisonette', 'Dachterrasse', 'Balkon', '2 Bäder', 'Tiefgarage'],
  ARRAY[
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'
  ],
  ARRAY['Premium-Ausstattung', 'Dachterrasse 40m²', 'Tiefgarage inkl.'],
  ARRAY['Hoher Preis'],
  92,
  'green',
  2.9,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
-- Property 4: Köln
(
  'Charmante 1-Zimmer Wohnung in Köln Ehrenfeld',
  'Gemütliche Single-Wohnung in angesagtem Viertel. Perfekt für Studenten.',
  'Köln Ehrenfeld',
  'Venloer Straße 234, 50823 Köln',
  185000,
  38,
  1,
  ARRAY['Laminat', 'Dusche', 'Keller', 'S-Bahn nah'],
  ARRAY[
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
  ],
  ARRAY['Ehrenfeld angesagt', 'Gute Verkehrsanbindung'],
  ARRAY['Klein', 'Straßenlärm'],
  68,
  'red',
  4.2,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
-- Property 5: Frankfurt
(
  'Neubau 3-Zimmer mit Balkon in Frankfurt Sachsenhausen',
  'Erstbezug! Moderne Neubau-Wohnung. Fußbodenheizung, Südbalkon, KfW 55.',
  'Frankfurt Sachsenhausen',
  'Schweizer Straße 67, 60594 Frankfurt',
  520000,
  78,
  3,
  ARRAY['Neubau', 'Erstbezug', 'Balkon', 'Fußbodenheizung', 'KfW 55'],
  ARRAY[
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800'
  ],
  ARRAY['Neubau Erstbezug', 'KfW 55', 'Sachsenhausen Top-Lage'],
  ARRAY['Hoher Kaufpreis'],
  82,
  'yellow',
  3.5,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
-- Property 6: Stuttgart
(
  'Großzügige 5-Zimmer Wohnung in Stuttgart West',
  'Perfekt für Familien! 5-Zimmer mit 2 Bädern, Loggia, Spielplatz im Innenhof.',
  'Stuttgart West',
  'Rotebühlstraße 145, 70178 Stuttgart',
  720000,
  138,
  5,
  ARRAY['2 Bäder', 'Gäste-WC', 'Loggia', 'Parkett', 'Spielplatz'],
  ARRAY[
    'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800',
    'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800'
  ],
  ARRAY['Familienfreundlich', 'Viel Platz - 138m²', '2 Bäder'],
  ARRAY['3. OG ohne Aufzug'],
  71,
  'yellow',
  3.1,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
);

-- 4. Verify
SELECT
  id,
  title,
  location,
  price,
  ai_investment_score,
  score_color
FROM properties
WHERE user_id = 'b65b6fea-497e-4e24-b267-926e6ce294c9'
ORDER BY created_at DESC;
```

### Schritt 2: Script ausführen

1. Klicke auf **"Run"** (oder Cmd/Ctrl + Enter)
2. Warte auf grünen Haken ✅
3. Prüfe die Ergebnistabelle unten - du solltest 6 Properties sehen

### Schritt 3: OpenAI API Key setzen (OPTIONAL - für KI-Chat)

Falls du den KI-Assistenten nutzen möchtest:

1. Hol dir einen OpenAI API Key: https://platform.openai.com/api-keys
2. Füge ihn in `apps/web/.env.local` ein:
   ```bash
   NEXT_PUBLIC_OPENAI_API_KEY=sk-...
   ```
3. Deploye die Edge Function:
   ```bash
   supabase functions deploy ai-chat
   ```

---

## ✅ Nach Ausführung

Starte den Server neu:
```bash
# Aktuellen Server stoppen (Ctrl+C)
pnpm dev:web
```

Die App sollte jetzt 6 Properties anzeigen! 🎉
