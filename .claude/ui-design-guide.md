danger# Rendito UI Design Guide

## Farbsystem

### Primary (Coral #FF385C)
- Haupt-CTAs
- Active States
- Wichtige Buttons

### Accent Colors

| Farbe | Hex | Verwendung |
|-------|-----|------------|
| `accent-aqua` | #7DD3E8 | Premium-Badges, Pool-Features, Trust-Signals |
| `accent-aqua-light` | #B5E8F0 | Hover States, Borders |
| `accent-aqua-50` | #E8F9FC | Soft Backgrounds, Price Highlights |
| `accent-cream` | #FFF5F5 | Seiten-Hintergrund (statt weiß/grau) |
| `accent-cream-dark` | #F5EDE8 | Card Borders |
| `accent-sky` | #E8F4F8 | Info-Bereiche, Search Bar, Filter Tags |
| `accent-blush` | #FDF4F8 | Persönliche Touches, Anbieter-Info |
| `accent-blush-dark` | #FADADD | Blush Borders |

---

## Seiten-Hintergründe

Alle Seiten verwenden `bg-accent-cream` statt `bg-white`, `bg-gray-50` oder `bg-background`:

- `/` (Startseite)
- `/property/[id]`
- `/my-properties`
- `/favorites`
- `/messages`
- `/profile`
- `/suggestions`
- `/create-listing`
- `/import-listing`
- `/auth/login`
- `/auth/signup`

---

## Glassmorphismus-Design

### Standard Glass Background
```css
background: rgba(0, 0, 0, 0.5);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.15);
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
```

### Komponenten mit Glassmorphismus
- `GlassActionButton` - Favorit/Dismiss Buttons auf Bildern
- `PropertyScoreBadge` - AI Score Badge auf Bildern

---

## PropertyScoreBadge

Layout (vertikal):
```
  Excellent
   🟢 85
```

- Label oben (farbig je nach Score)
- Punkt + Score unten
- Punkt vor der Zahl, ohne Schatten

### Score-Schwellenwerte
| Score | Label | Farbe |
|-------|-------|-------|
| >= 70 | Excellent | #22C55E (grün) |
| >= 40 | Moderat | #F59E0B (amber) |
| < 40 | Risiko | #EF4444 (rot) |

---

## GlassActionButton

### Typen
- `favorite` - Herz-Icon in Coral (#FF385C)
- `dismiss` - X-Icon in Weiß (#FFFFFF)

### Features
- Tooltips (Hover)
- Scale Animation (hover/active)
- Glassmorphismus Background

---

## SearchBar

```jsx
<div className="bg-accent-sky rounded-full border border-gray-200
               hover:border-accent-aqua focus-within:border-accent-aqua
               focus-within:ring-4 focus-within:ring-accent-aqua-50">
```

---

## Filter Tags

```jsx
<span className="bg-accent-sky text-gray-700 rounded-full border border-blue-200">
```

---

## Shadows

| Name | Verwendung |
|------|------------|
| `shadow-glow` | Primary CTAs, Featured Cards |
| `shadow-glow-aqua` | Premium Badges (sparsam) |
| `shadow-soft` | Info Boxes |
| `shadow-card` | Reguläre Cards |

---

## PropertyPreview Sections

| Section | Background |
|---------|------------|
| Price Card | `bg-gradient-to-br from-accent-cream via-white to-accent-aqua-50` |
| Price/m² | `bg-accent-aqua-50 border-accent-aqua-light` |
| Weitere Details | `bg-accent-cream` |
| Anbieter Info | `bg-accent-blush` |
| Property Type Badge | `bg-accent-sky` |

---

## DO's & DON'Ts

### DO's
- `accent-cream` als Standard-Hintergrund
- Glassmorphismus für Overlays auf Bildern
- Icons + Farbe kombinieren (Accessibility)
- Max 3 Accent Colors pro View

### DON'Ts
- Glow überall (verliert Wirkung)
- Primary Coral ersetzen
- Zu viele Farben in einer Komponente
- Nur auf Farbe verlassen (Icons nutzen)
