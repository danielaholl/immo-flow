# PLZ-Datenbank für Deutschland

## 📍 Aktueller Status

Die aktuelle `postal-codes.json` enthält **ca. 300 Postleitzahlen** der wichtigsten deutschen Großstädte:

- ✅ Berlin (75+ PLZ)
- ✅ Hamburg (30+ PLZ)
- ✅ München (60+ PLZ)
- ✅ Köln (30+ PLZ)
- ✅ Frankfurt am Main (30+ PLZ)
- ✅ Stuttgart (25+ PLZ)
- ✅ Düsseldorf (30+ PLZ)
- ✅ Dortmund (25+ PLZ)
- ✅ Essen (25+ PLZ)
- ✅ Leipzig (25+ PLZ)

## 🔄 Hybrid-Ansatz

Die App nutzt einen **3-Stufen-Fallback-Mechanismus**:

1. **Lokale Datenbank** (postal-codes.json)
   - ✅ Sofortige Antwort
   - ✅ Offline verfügbar
   - ✅ Keine API-Kosten

2. **Nominatim API** (OpenStreetMap)
   - 🌐 Für fehlende PLZ
   - ✅ Kostenlos
   - ⚠️ Benötigt Internetverbindung

3. **Fallback auf PLZ**
   - Wenn alles fehlschlägt, wird nur die PLZ angezeigt

## 📦 Vollständige Datenbank hinzufügen

### Option 1: OpenGeoDB (Empfohlen für DE)

1. **Download:**
   ```bash
   # Download der deutschen PLZ-Daten von OpenGeoDB
   wget http://www.fa-technik.adfc.de/code/opengeodb/DE.tab
   ```

2. **Konvertierung zu JSON:**
   ```javascript
   // scripts/convert-plz-data.js
   const fs = require('fs');
   const readline = require('readline');

   const fileStream = fs.createReadStream('DE.tab');
   const rl = readline.createInterface({
     input: fileStream,
     crlfDelay: Infinity
   });

   const postalCodes = {};

   rl.on('line', (line) => {
     const parts = line.split('\t');
     if (parts[0] && parts[1] && parts[2]) {
       const plz = parts[0].trim();
       const city = parts[1].trim();
       const district = parts[2].trim();

       postalCodes[plz] = {
         city,
         district: district !== city ? district : undefined
       };
     }
   });

   rl.on('close', () => {
     fs.writeFileSync(
       'postal-codes.json',
       JSON.stringify(postalCodes, null, 2)
     );
     console.log(`✓ ${Object.keys(postalCodes).length} PLZ konvertiert`);
   });
   ```

3. **Ausführen:**
   ```bash
   node scripts/convert-plz-data.js
   ```

### Option 2: GeoNames

1. **Download:**
   ```bash
   wget https://download.geonames.org/export/zip/DE.zip
   unzip DE.zip
   ```

2. **Format:** Tab-separated file mit folgender Struktur:
   ```
   country code : iso country code, 2 characters
   postal code  : varchar(20)
   place name   : varchar(180)
   admin name1  : 1. order subdivision (state) varchar(100)
   admin code1  : 1. order subdivision (state) varchar(20)
   ...
   ```

3. **Konvertierung:**
   ```javascript
   // scripts/convert-geonames.js
   const fs = require('fs');
   const readline = require('readline');

   const fileStream = fs.createReadStream('DE.txt');
   const rl = readline.createInterface({
     input: fileStream,
     crlfDelay: Infinity
   });

   const postalCodes = {};

   rl.on('line', (line) => {
     const parts = line.split('\t');
     const plz = parts[1]?.trim();
     const placeName = parts[2]?.trim();
     const adminName = parts[3]?.trim();

     if (plz && placeName) {
       postalCodes[plz] = {
         city: adminName || placeName,
         district: placeName !== adminName ? placeName : undefined
       };
     }
   });

   rl.on('close', () => {
     fs.writeFileSync(
       'postal-codes.json',
       JSON.stringify(postalCodes, null, 2)
     );
     console.log(`✓ ${Object.keys(postalCodes).length} PLZ konvertiert`);
   });
   ```

### Option 3: NPM Package (Schnellste Lösung)

```bash
npm install postal-codes-js
```

```javascript
// In create-listing/page.tsx
import postalCodes from 'postal-codes-js';

const getLocationFromPostalCode = async (postalCode: string) => {
  const result = postalCodes.lookup(postalCode, 'DE');
  if (result) {
    return `${result.city}`;
  }
  // ... Fallback to Nominatim
};
```

## 📊 Datenbank-Größe

- **300 PLZ (aktuell):** ~15 KB
- **Alle deutschen PLZ (~8.200):** ~400-500 KB
- **Mit Kompression (gzip):** ~80-100 KB

## 🔧 Wartung

### Neue Städte hinzufügen

Einfach zur `postal-codes.json` hinzufügen:

```json
{
  "12345": {
    "city": "Musterstadt",
    "district": "Musterviertel"
  }
}
```

### Daten aktualisieren

PLZ-Änderungen sind selten, aber:

1. **Jährlich prüfen:** [Deutsche Post PLZ-Änderungen](https://www.deutschepost.de/de/p/postleitzahlen.html)
2. **Automatisch:** Nominatim API deckt neue PLZ automatisch ab

## 🎯 Performance-Optimierung

### Lazy Loading (bereits implementiert)

```typescript
const postalCodesModule = await import('./data/postal-codes.json');
```

Die Datenbank wird erst geladen, wenn sie benötigt wird.

### Code Splitting

Next.js splittert automatisch - die PLZ-Datenbank wird nur auf der Create-Listing-Page geladen.

## 🚀 Best Practices

1. **Lokale Datenbank:** Für häufige Anfragen (Berlin, München, Hamburg)
2. **API Fallback:** Für seltene oder neue PLZ
3. **Rate Limiting:** Nominatim hat 1 Request/Sekunde Limit
4. **Caching:** Ergebnisse von Nominatim könnten gecacht werden

## 🔗 Nützliche Links

- [OpenGeoDB](http://www.opengeodb.org/)
- [GeoNames](https://www.geonames.org/)
- [Nominatim API](https://nominatim.org/)
- [Deutsche Post PLZ-Suche](https://www.deutschepost.de/de/p/postleitzahlen.html)

---

**Status:** ✅ Produktionsbereit mit 300 PLZ + Nominatim Fallback
