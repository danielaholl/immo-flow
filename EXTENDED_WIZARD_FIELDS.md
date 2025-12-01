# Extended Wizard Fields Plan

## Neue Felder in korrekter Reihenfolge:

1. ✅ Willkommen (ohne Haus-Icon)
2. ✅ Bilder hochladen
3. ✅ Immobilientyp
4. ✅ Standort PLZ → AI ermittelt Stadtteil und Ort
5. **NEU**: Straße mit Nummer
6. **NEU**: Wie viele Stockwerke hat das Haus?
7. **NEU**: Welches Stockwerk? (EG, DG, andere)
8. ✅ Fläche (sqm)
9. **NEU**: Nutzfläche mit Anteil (1/2, 1/4)
10. ✅ Anzahl Zimmer
11. **NEU**: Anzahl Badezimmer
12. ✅ Objekt Zustand
13. ✅ Ausstattung (Features)
14. **NEU**: Bezugfrei ab (sofort oder Datum)
15. ✅ Stichpunkte
16. ✅ Beschreibung (AI-generiert)
17. **MOVED**: Titel (war früher, jetzt nach Beschreibung)
18. ✅ Kaufpreis (inkl. Garage/Stellplatz) → Preis/qm im Chat anzeigen
19. **NEU**: Höhe Hausgeld
20. **NEU**: Baujahr
21. **NEU**: Heizungsart
22. **NEU**: Energieträger
23. **NEU**: Energieausweis
24. ✅ Provision (Ja/Nein)
25. ✅ Provisions-Satz (wenn Ja)
26. ✅ Adress- und Provisions-Vereinbarung
27. ✅ Besichtigungstermine

## Neue Interface-Felder für ListingData:

```typescript
interface ListingData {
  // Existing
  user_type?: string;
  property_type: string;
  title: string;
  location: string;
  price: number;
  commission_rate?: number;
  require_address_consent?: boolean;
  sqm: number;
  rooms: number;
  condition: string;
  features: string[];
  images: string[];
  description?: string;
  viewing_appointments?: ViewingAppointment[];

  // NEW
  postal_code?: string;
  street_address?: string;
  total_floors?: number;
  floor_level?: string;
  usable_area?: number;
  usable_area_ratio?: string;
  bathrooms?: number;
  available_from?: string; // 'sofort' or date string
  monthly_fee?: number;
  year_built?: number;
  heating_type?: string;
  energy_source?: string;
  energy_certificate?: string;
}
```

## Labels und Optionen:

### Stockwerk-Level:
- EG (Erdgeschoss)
- DG (Dachgeschoss)
- 1. OG
- 2. OG
- 3. OG
- 4. OG+

### Nutzfläche-Verhältnis:
- Voll (1/1)
- Halb (1/2)
- Viertel (1/4)
- Nicht vorhanden

### Heizungsart:
- Zentralheizung
- Fußbodenheizung
- Gasheizung
- Ölheizung
- Fernwärme
- Elektroheizung
- Solarheizung
- Wärmepumpe
- Sonstige

### Energieträger:
- Gas
- Öl
- Strom
- Fernwärme
- Solar
- Geothermie
- Biomasse
- Sonstige

### Energieausweis:
- Bedarfsausweis
- Verbrauchsausweis
- Nicht vorhanden
