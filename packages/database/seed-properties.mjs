#!/usr/bin/env node
/**
 * Seed test properties into Supabase
 * Run: node seed-properties.mjs
 */

import { createClient } from './node_modules/@supabase/supabase-js/dist/module/index.js';

const supabaseUrl = 'https://lntoolqtllivzdkhvvqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudG9vbHF0bGxpdnpka2h2dnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk2MzQsImV4cCI6MjA3OTczNTYzNH0.wkBFd1aqMySNHGXRYnz4kZs0ETOL4p6q_4fGQrVxz60';

const supabase = createClient(supabaseUrl, supabaseKey);

const testProperties = [
  {
    title: 'Moderne 3-Zimmer Wohnung in München Schwabing',
    description: 'Helle 3-Zimmer-Wohnung in bester Lage von Schwabing. Renoviert 2022, Balkon mit Südausrichtung, hochwertige Einbauküche, Eichenparkett. Sehr gute Anbindung an öffentliche Verkehrsmittel.',
    location: 'München Schwabing',
    address: 'Leopoldstraße 45, 80802 München',
    price: 650000,
    sqm: 85,
    rooms: 3,
    features: ['Balkon', 'Einbauküche', 'Parkett', 'Renoviert', 'Aufzug', 'Kellerabteil'],
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
    ],
    highlights: ['Top Lage Schwabing', 'Renoviert 2022', 'Balkon Südseite', 'U-Bahn 300m'],
    red_flags: ['Kein Stellplatz', 'Altbau - höhere Nebenkosten'],
    ai_investment_score: 87,
    score_color: 'green',
    yield: 3.2,
    status: 'active',
    user_id: 'b65b6fea-497e-4e24-b267-926e6ce294c9'
  },
  {
    title: 'Traumhafte 2-Zimmer Wohnung in Berlin Prenzlauer Berg',
    description: 'Wunderschöne Altbauwohnung mit hohen Decken und großen Fenstern. Komplett saniert, moderne Küche, Badezimmer mit Badewanne, Dielenboden. Ruhige Seitenstraße, Hinterhof.',
    location: 'Berlin Prenzlauer Berg',
    address: 'Kollwitzstraße 12, 10405 Berlin',
    price: 420000,
    sqm: 68,
    rooms: 2,
    features: ['Altbau', 'Hohe Decken', 'Einbauküche', 'Badewanne', 'Dielenboden', 'Ruhig'],
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800',
      'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800'
    ],
    highlights: ['Prenzlauer Berg Top-Lage', 'Saniert', 'Hohe Altbaudecken', 'Tram vor der Tür'],
    red_flags: ['Keine Aufzug (3. OG)', 'Straßenparkplatz rar'],
    ai_investment_score: 75,
    score_color: 'yellow',
    yield: 3.8,
    status: 'active',
    user_id: 'b65b6fea-497e-4e24-b267-926e6ce294c9'
  },
  {
    title: 'Exklusive 4-Zimmer Maisonette in Hamburg Eppendorf',
    description: 'Traumhafte Maisonette-Wohnung über 2 Etagen. Offene Küche zum Wohnzimmer, 2 Bäder, großer Balkon, Dachterrasse, Gäste-WC. Premium-Ausstattung, Fußbodenheizung, Smart Home.',
    location: 'Hamburg Eppendorf',
    address: 'Eppendorfer Landstraße 88, 20249 Hamburg',
    price: 890000,
    sqm: 125,
    rooms: 4,
    features: ['Maisonette', 'Dachterrasse', 'Balkon', '2 Bäder', 'Fußbodenheizung', 'Smart Home', 'Tiefgarage'],
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
    ],
    highlights: ['Premium-Ausstattung', 'Dachterrasse 40m²', 'Tiefgarage inkl.', 'Eppendorf Top-Lage'],
    red_flags: ['Hoher Preis', 'Hohe Nebenkosten'],
    ai_investment_score: 92,
    score_color: 'green',
    yield: 2.9,
    status: 'active',
    user_id: 'b65b6fea-497e-4e24-b267-926e6ce294c9'
  },
  {
    title: 'Charmante 1-Zimmer Wohnung in Köln Ehrenfeld',
    description: 'Gemütliche Single-Wohnung in angesagtem Viertel. Perfekt für Studenten oder Berufseinsteiger. Küche, Bad mit Dusche, Laminat. S-Bahn 5 Minuten zu Fuß.',
    location: 'Köln Ehrenfeld',
    address: 'Venloer Straße 234, 50823 Köln',
    price: 185000,
    sqm: 38,
    rooms: 1,
    features: ['Laminat', 'Dusche', 'Keller', 'S-Bahn nah'],
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
    ],
    highlights: ['Ehrenfeld angesagt', 'Gute Verkehrsanbindung', 'Einkaufsmöglichkeiten nah'],
    red_flags: ['Klein', 'Straßenlärm', 'Kein Balkon'],
    ai_investment_score: 68,
    score_color: 'red',
    yield: 4.2,
    status: 'active',
    user_id: 'b65b6fea-497e-4e24-b267-926e6ce294c9'
  },
  {
    title: 'Neubau 3-Zimmer mit Balkon in Frankfurt Sachsenhausen',
    description: 'Erstbezug! Moderne 3-Zimmer-Wohnung im Neubau. Fußbodenheizung, bodentiefe Fenster, großer Südbalkon, Einbauküche, Video-Gegensprechanlage. KfW 55 Standard.',
    location: 'Frankfurt Sachsenhausen',
    address: 'Schweizer Straße 67, 60594 Frankfurt',
    price: 520000,
    sqm: 78,
    rooms: 3,
    features: ['Neubau', 'Erstbezug', 'Balkon', 'Fußbodenheizung', 'Einbauküche', 'KfW 55', 'Videosprechanlage'],
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800'
    ],
    highlights: ['Neubau Erstbezug', 'KfW 55 - niedrige Nebenkosten', 'Sachsenhausen Top-Lage', 'Main 10 Min zu Fuß'],
    red_flags: ['Hoher Kaufpreis', 'Neubaugebiet noch im Aufbau'],
    ai_investment_score: 82,
    score_color: 'yellow',
    yield: 3.5,
    status: 'active',
    user_id: 'b65b6fea-497e-4e24-b267-926e6ce294c9'
  },
  {
    title: 'Großzügige 5-Zimmer Wohnung in Stuttgart West',
    description: 'Perfekt für Familien! 5-Zimmer-Wohnung mit 2 Bädern, Gäste-WC, großem Wohnzimmer, Arbeitszimmer, Loggia. Parkett, Einbauküche, Abstellraum. Spielplatz im Innenhof.',
    location: 'Stuttgart West',
    address: 'Rotebühlstraße 145, 70178 Stuttgart',
    price: 720000,
    sqm: 138,
    rooms: 5,
    features: ['2 Bäder', 'Gäste-WC', 'Loggia', 'Parkett', 'Einbauküche', 'Abstellraum', 'Spielplatz'],
    images: [
      'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800',
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800'
    ],
    highlights: ['Familienfreundlich', 'Viel Platz - 138m²', '2 Bäder', 'Stuttgart West zentral'],
    red_flags: ['3. OG ohne Aufzug', 'Renovierungsstau'],
    ai_investment_score: 71,
    score_color: 'yellow',
    yield: 3.1,
    status: 'active',
    user_id: 'b65b6fea-497e-4e24-b267-926e6ce294c9'
  }
];

async function seedProperties() {
  console.log('🌱 Starting property seeding...\n');

  for (const property of testProperties) {
    console.log(`📍 Inserting: ${property.title}`);

    const { data, error } = await supabase
      .from('properties')
      .insert([property])
      .select();

    if (error) {
      console.error(`❌ Error inserting ${property.title}:`, error.message);
    } else {
      console.log(`✅ Successfully inserted: ${property.title} (ID: ${data[0].id})\n`);
    }
  }

  // Verify insertion
  console.log('\n🔍 Verifying inserted properties...');
  const { data: allProperties, error: fetchError } = await supabase
    .from('properties')
    .select('id, title, location, price, ai_investment_score')
    .eq('user_id', 'b65b6fea-497e-4e24-b267-926e6ce294c9')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching properties:', fetchError.message);
  } else {
    console.log(`\n✅ Total properties found: ${allProperties.length}`);
    console.table(allProperties);
  }

  console.log('\n✨ Seeding complete!');
}

seedProperties().catch(console.error);
