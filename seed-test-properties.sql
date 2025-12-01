-- =====================================================
-- SEED TEST PROPERTIES
-- =====================================================
-- This script creates test properties for development
-- Run this in Supabase SQL Editor

-- Delete existing test properties (optional)
-- DELETE FROM properties WHERE title LIKE 'TEST:%';

-- Insert 6 test properties with realistic German real estate data
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
(
  'Moderne 3-Zimmer Wohnung in München Schwabing',
  'Helle 3-Zimmer-Wohnung in bester Lage von Schwabing. Renoviert 2022, Balkon mit Südausrichtung, hochwertige Einbauküche, Eichenparkett. Sehr gute Anbindung an öffentliche Verkehrsmittel.',
  'München Schwabing',
  'Leopoldstraße 45, 80802 München',
  650000,
  85,
  3,
  ARRAY['Balkon', 'Einbauküche', 'Parkett', 'Renoviert', 'Aufzug', 'Kellerabteil'],
  ARRAY[
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
  ],
  ARRAY['Top Lage Schwabing', 'Renoviert 2022', 'Balkon Südseite', 'U-Bahn 300m'],
  ARRAY['Kein Stellplatz', 'Altbau - höhere Nebenkosten'],
  87,
  'green',
  3.2,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
(
  'Traumhafte 2-Zimmer Wohnung in Berlin Prenzlauer Berg',
  'Wunderschöne Altbauwohnung mit hohen Decken und großen Fenstern. Komplett saniert, moderne Küche, Badezimmer mit Badewanne, Dielenboden. Ruhige Seitenstraße, Hinterhof.',
  'Berlin Prenzlauer Berg',
  'Kollwitzstraße 12, 10405 Berlin',
  420000,
  68,
  2,
  ARRAY['Altbau', 'Hohe Decken', 'Einbauküche', 'Badewanne', 'Dielenboden', 'Ruhig'],
  ARRAY[
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800',
    'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800'
  ],
  ARRAY['Prenzlauer Berg Top-Lage', 'Saniert', 'Hohe Altbaudecken', 'Tram vor der Tür'],
  ARRAY['Keine Aufzug (3. OG)', 'Straßenparkplatz rar'],
  75,
  'yellow',
  3.8,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
(
  'Exklusive 4-Zimmer Maisonette in Hamburg Eppendorf',
  'Traumhafte Maisonette-Wohnung über 2 Etagen. Offene Küche zum Wohnzimmer, 2 Bäder, großer Balkon, Dachterrasse, Gäste-WC. Premium-Ausstattung, Fußbodenheizung, Smart Home.',
  'Hamburg Eppendorf',
  'Eppendorfer Landstraße 88, 20249 Hamburg',
  890000,
  125,
  4,
  ARRAY['Maisonette', 'Dachterrasse', 'Balkon', '2 Bäder', 'Fußbodenheizung', 'Smart Home', 'Tiefgarage'],
  ARRAY[
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
  ],
  ARRAY['Premium-Ausstattung', 'Dachterrasse 40m²', 'Tiefgarage inkl.', 'Eppendorf Top-Lage'],
  ARRAY['Hoher Preis', 'Hohe Nebenkosten'],
  92,
  'green',
  2.9,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
(
  'Charmante 1-Zimmer Wohnung in Köln Ehrenfeld',
  'Gemütliche Single-Wohnung in angesagtem Viertel. Perfekt für Studenten oder Berufseinsteiger. Küche, Bad mit Dusche, Laminat. S-Bahn 5 Minuten zu Fuß.',
  'Köln Ehrenfeld',
  'Venloer Straße 234, 50823 Köln',
  185000,
  38,
  1,
  ARRAY['Laminat', 'Dusche', 'Keller', 'S-Bahn nah'],
  ARRAY[
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
  ],
  ARRAY['Ehrenfeld angesagt', 'Gute Verkehrsanbindung', 'Einkaufsmöglichkeiten nah'],
  ARRAY['Klein', 'Straßenlärm', 'Kein Balkon'],
  68,
  'red',
  4.2,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
(
  'Neubau 3-Zimmer mit Balkon in Frankfurt Sachsenhausen',
  'Erstbezug! Moderne 3-Zimmer-Wohnung im Neubau. Fußbodenheizung, bodentiefe Fenster, großer Südbalkon, Einbauküche, Video-Gegensprechanlage. KfW 55 Standard.',
  'Frankfurt Sachsenhausen',
  'Schweizer Straße 67, 60594 Frankfurt',
  520000,
  78,
  3,
  ARRAY['Neubau', 'Erstbezug', 'Balkon', 'Fußbodenheizung', 'Einbauküche', 'KfW 55', 'Videosprechanlage'],
  ARRAY[
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800'
  ],
  ARRAY['Neubau Erstbezug', 'KfW 55 - niedrige Nebenkosten', 'Sachsenhausen Top-Lage', 'Main 10 Min zu Fuß'],
  ARRAY['Hoher Kaufpreis', 'Neubaugebiet noch im Aufbau'],
  82,
  'yellow',
  3.5,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
),
(
  'Großzügige 5-Zimmer Wohnung in Stuttgart West',
  'Perfekt für Familien! 5-Zimmer-Wohnung mit 2 Bädern, Gäste-WC, großem Wohnzimmer, Arbeitszimmer, Loggia. Parkett, Einbauküche, Abstellraum. Spielplatz im Innenhof.',
  'Stuttgart West',
  'Rotebühlstraße 145, 70178 Stuttgart',
  720000,
  138,
  5,
  ARRAY['2 Bäder', 'Gäste-WC', 'Loggia', 'Parkett', 'Einbauküche', 'Abstellraum', 'Spielplatz'],
  ARRAY[
    'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800',
    'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800'
  ],
  ARRAY['Familienfreundlich', 'Viel Platz - 138m²', '2 Bäder', 'Stuttgart West zentral'],
  ARRAY['3. OG ohne Aufzug', 'Renovierungsstau'],
  71,
  'yellow',
  3.1,
  'active',
  'b65b6fea-497e-4e24-b267-926e6ce294c9'
);

-- Show inserted properties
SELECT
  id,
  title,
  location,
  CONCAT(price::text, ' €') as price,
  CONCAT(sqm::text, ' m²') as sqm,
  rooms,
  ai_investment_score,
  score_color
FROM properties
WHERE user_id = 'b65b6fea-497e-4e24-b267-926e6ce294c9'
ORDER BY created_at DESC;
