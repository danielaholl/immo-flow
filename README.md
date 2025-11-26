# ImmoFlow - TikTok-Style Immobilien Investment App

> Ein modernes Monorepo für eine Immobilien-Investment-Plattform mit React Native Web, Next.js und Supabase.

## Projekt-Übersicht

ImmoFlow ist eine TikTok-style Immobilien-App für den deutschen Markt mit:

- 📱 **Mobile App** (iOS/Android via Expo)
- 🌐 **Web App** (SEO-optimiert mit Next.js 14)
- 🏢 **Admin Dashboard** für Makler
- 🤖 **AI-gestützter Property-Assistent**
- 📊 **Investment-Analysen** (Rendite, Steuer, Lage)
- ❤️ **Favoriten & Matching-Algorithmus**
- 📅 **Besichtigungstermin-Buchungen**

## Tech Stack

### Frontend
- **Expo** - React Native für iOS/Android/Web
- **Next.js 14** - SEO-optimierte Web-Version
- **TypeScript** - Type-safety across the board
- **NativeWind/Tailwind** - Styling
- **React Native Reanimated** - Animationen

### Backend
- **Supabase** - PostgreSQL Database + Auth + Storage + Realtime
- **Edge Functions** - Deno für AI-Chat

### Monorepo
- **Turborepo** - Build orchestration
- **pnpm workspaces** - Package management

## Projekt-Struktur

```
immoflow/
├── apps/
│   ├── web/              # Next.js 14 Web App
│   ├── mobile/           # Expo App (iOS/Android)
│   └── admin/            # Makler Dashboard
├── packages/
│   ├── ui/               # Shared UI Components
│   ├── database/         # Supabase Client + Types + Hooks
│   ├── api/              # API Functions
│   ├── utils/            # Shared Utilities
│   └── config/           # Shared Configs (ESLint, TS, Tailwind)
├── supabase/
│   ├── migrations/       # Database Migrations
│   └── functions/        # Edge Functions
└── package.json          # Root package.json
```

## Schnellstart

### Voraussetzungen

- **Node.js** 18+
- **pnpm** 8+
- **Supabase Account** ([supabase.com](https://supabase.com))
- **Expo CLI** (optional, für mobile development)

### Installation

1. **Repository klonen**
   ```bash
   cd immoflow
   ```

2. **Dependencies installieren**
   ```bash
   pnpm install
   ```

3. **Supabase Projekt erstellen**

   a. Gehe zu [supabase.com](https://supabase.com) und erstelle ein neues Projekt

   b. Kopiere die Projekt-URL und Anon Key

4. **Environment Variables setzen**

   Erstelle `.env.local` Dateien in den Apps:

   **apps/web/.env.local:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   **apps/mobile/.env:**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   **apps/admin/.env.local:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=http://localhost:3001
   ```

5. **Datenbank Setup**

   a. Öffne Supabase Dashboard > SQL Editor

   b. Führe die Migration aus:
   ```bash
   # Kopiere den Inhalt von packages/database/migrations/001_initial_schema.sql
   # und führe ihn im SQL Editor aus
   ```

6. **Development Server starten**

   Alle Apps gleichzeitig:
   ```bash
   pnpm dev
   ```

   Oder einzeln:
   ```bash
   # Web App (Port 3000)
   pnpm dev:web

   # Mobile App
   pnpm dev:mobile

   # Admin Dashboard (Port 3001)
   pnpm dev:admin
   ```

## Development

### Projekt-Befehle

```bash
# Development starten (alle Apps)
pnpm dev

# Production Build
pnpm build

# Linting
pnpm lint

# Type Checking
pnpm type-check

# Code Formatierung
pnpm format

# Alles aufräumen
pnpm clean
```

### Web App

```bash
cd apps/web

# Dev Server
pnpm dev

# Build
pnpm build

# Production Server
pnpm start
```

URL: [http://localhost:3000](http://localhost:3000)

### Mobile App

```bash
cd apps/mobile

# Dev Server
pnpm dev

# iOS Simulator
pnpm ios

# Android Emulator
pnpm android

# Web Browser
pnpm web
```

Scanne den QR-Code mit der Expo Go App (iOS/Android).

### Admin Dashboard

```bash
cd apps/admin

# Dev Server
pnpm dev

# Build
pnpm build
```

URL: [http://localhost:3001](http://localhost:3001)

## Datenbank

### Migrations ausführen

```bash
# In Supabase Dashboard > SQL Editor
# Kopiere und führe aus: packages/database/migrations/001_initial_schema.sql
```

### Types generieren

```bash
cd packages/database
pnpm generate-types
```

⚠️ **Wichtig:** Setze zuerst `YOUR_PROJECT_ID` in `packages/database/package.json`

## Packages

### @immoflow/ui

Shared UI Components (Button, PropertyCard, Input, Avatar, Badge)

```tsx
import { Button, PropertyCard } from '@immoflow/ui';

<Button variant="primary" onPress={() => {}}>
  Click me
</Button>
```

### @immoflow/database

Supabase Client, Types und React Hooks

```tsx
import { useProperties, useFavorites, useAuth } from '@immoflow/database';

const { properties, loading } = useProperties({ limit: 10 });
```

### @immoflow/api

Server-side API Functions

```tsx
import { getProperties, createProperty } from '@immoflow/api';

const properties = await getProperties({ location: 'Berlin' });
```

### @immoflow/utils

Utilities für Formatting, Validation und Constants

```tsx
import { formatPrice, formatArea } from '@immoflow/utils';

formatPrice(350000); // "350.000 €"
formatArea(85.5);    // "85,5 m²"
```

## Deployment

### Web App (Vercel)

```bash
cd apps/web

# Vercel CLI
vercel

# Oder via GitHub Integration
# Push to main branch -> Auto-deploy
```

### Mobile App

```bash
cd apps/mobile

# Build für App Stores
eas build --platform all

# Oder einzeln
eas build --platform ios
eas build --platform android
```

### Admin Dashboard (Vercel)

```bash
cd apps/admin
vercel
```

## Supabase Edge Functions

### AI Chat Function deployen

```bash
# Supabase CLI installieren
npm install -g supabase

# Login
supabase login

# Link Project
supabase link --project-ref your-project-ref

# Deploy Function
supabase functions deploy ai-chat
```

## Architektur

### Shared Code

Alle UI-Components in `packages/ui` sind **platform-agnostic** und funktionieren sowohl auf Web als auch Mobile (React Native Web).

### State Management

- React Hooks für lokalen State
- Supabase Realtime für Live-Updates
- Custom Hooks in `packages/database/src/hooks`

### Styling

- **Mobile:** React Native StyleSheet + NativeWind
- **Web:** Tailwind CSS
- **Shared Theme:** `packages/ui/src/theme`

### API Layer

- **Client-side:** React Hooks (`useProperties`, `useFavorites`)
- **Server-side:** Next.js API Routes + Supabase Functions

## Features

### Property Discovery
- TikTok-style Swipe Interface
- AI-basierte Property Scores
- Filtermöglichkeiten (Preis, Lage, Größe)

### Investment Analysen
- Renditeberechnung
- Lageanalyse
- Energieeffizienz

### Besichtigungen
- Termin-Buchungssystem
- Kalendar-Integration
- Benachrichtigungen

### Makler Dashboard
- Property Management
- Booking Verwaltung
- Analytics & Statistiken

## Troubleshooting

### Supabase Connection Error

```
Error: Missing Supabase environment variables
```

**Lösung:** Überprüfe `.env.local` Dateien in apps/web und apps/admin

### Expo Not Loading

```
Error: Unable to resolve module
```

**Lösung:**
```bash
cd apps/mobile
pnpm install
rm -rf node_modules/.cache
```

### Build Errors

```bash
# Komplettes Reset
pnpm clean
pnpm install
pnpm build
```

## Contributing

1. Feature Branch erstellen
2. Changes committen
3. Tests ausführen
4. Pull Request erstellen

## License

MIT License - siehe [LICENSE](LICENSE)

## Support

Bei Fragen:
- GitHub Issues
- Email: support@immoflow.de

---

**Built with ❤️ for the German Real Estate Market**
