-- Sample Data for ImmoFlow
-- Use this for development/testing

-- Insert sample properties
INSERT INTO properties (
  title,
  description,
  location,
  price,
  sqm,
  rooms,
  features,
  images,
  highlights,
  red_flags,
  ai_score,
  yield,
  energy_class,
  status
) VALUES
(
  'Moderne 3-Zimmer Wohnung in Berlin Mitte',
  'Exklusive Neubauwohnung im Herzen Berlins. Hochwertige Ausstattung mit Einbauküche, Fußbodenheizung und großem Balkon. Perfekt für Investoren oder Eigennutzer.',
  'Berlin Mitte',
  450000,
  85,
  3,
  ARRAY['Balkon', 'Einbauküche', 'Fußbodenheizung', 'Aufzug', 'Neubau'],
  ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'
  ],
  ARRAY['Top Lage in Berlin Mitte', 'Neubau 2023', 'Energieeffizient A+', 'Hohe Mietrendite'],
  ARRAY['Hohe Grunderwerbssteuer in Berlin'],
  92,
  4.2,
  'A+',
  'active'
),
(
  'Charmante Altbauwohnung in München Schwabing',
  'Wunderschöne 4-Zimmer Altbauwohnung mit Stuck und hohen Decken. Ideal für Familien.',
  'München Schwabing',
  720000,
  110,
  4,
  ARRAY['Balkon', 'Stuck', 'Dielenboden', 'Keller'],
  ARRAY[
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
  ],
  ARRAY['Beliebte Wohngegend', 'Altbau-Charme', 'Gute Verkehrsanbindung'],
  ARRAY['Sanierungsbedarf Küche', 'Keine Einbauküche'],
  78,
  3.5,
  'C',
  'active'
),
(
  'Luxus-Penthouse mit Dachterrasse Hamburg',
  'Atemberaubendes Penthouse mit 360° Blick über Hamburg. Premium-Ausstattung auf 150m².',
  'Hamburg Hafencity',
  1200000,
  150,
  5,
  ARRAY['Dachterrasse', 'Einbauküche', 'Fußbodenheizung', 'Smart Home', 'Tiefgarage', 'Concierge'],
  ARRAY[
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
  ],
  ARRAY['Exklusive Lage Hafencity', 'Luxus-Ausstattung', 'Traumhafte Aussicht'],
  ARRAY['Sehr hoher Kaufpreis', 'Hohe Nebenkosten'],
  88,
  3.1,
  'A',
  'active'
),
(
  'Renovierte 2-Zimmer Wohnung in Köln Ehrenfeld',
  'Frisch renovierte Wohnung in trendiger Lage. Perfekt für junge Berufstätige.',
  'Köln Ehrenfeld',
  280000,
  65,
  2,
  ARRAY['Balkon', 'Einbauküche', 'Renoviert'],
  ARRAY[
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800'
  ],
  ARRAY['Trendviertel', 'Renoviert 2024', 'Gute Anbindung'],
  ARRAY['Kleine Wohnung', 'Straßenlärm möglich'],
  85,
  4.8,
  'B',
  'active'
),
(
  'Großzügige Familienwohnung Frankfurt Westend',
  '5-Zimmer Wohnung mit zwei Bädern. Ideal für große Familien.',
  'Frankfurt Westend',
  890000,
  140,
  5,
  ARRAY['Balkon', 'Gäste-WC', 'Einbauküche', 'Keller', 'Parkett'],
  ARRAY[
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800'
  ],
  ARRAY['Ruhige Wohnlage', 'Familienfreundlich', 'Nahe Schulen'],
  ARRAY['Älteres Gebäude', 'Energieausweis C'],
  82,
  3.9,
  'C',
  'active'
),
(
  'Stylisches Loft in Stuttgart Mitte',
  'Einzigartiges Industrial Loft mit 4m hohen Decken. Kreatives Wohnen auf 95m².',
  'Stuttgart Mitte',
  520000,
  95,
  2,
  ARRAY['Loft-Charakter', 'Einbauküche', 'Hohe Decken'],
  ARRAY[
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800'
  ],
  ARRAY['Einzigartiger Charakter', 'Zentrale Lage', 'Kreatives Ambiente'],
  ARRAY['Wenig Stauraum', 'Nur 2 Zimmer'],
  87,
  4.1,
  'B',
  'active'
);
