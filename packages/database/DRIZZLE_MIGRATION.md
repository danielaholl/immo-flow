# Drizzle ORM Migration Guide

## ✅ Phase 0-1 Complete

### Was wurde gemacht?

1. **Dependencies installiert**
   - `drizzle-orm@0.45.1`
   - `postgres@3.4.8`
   - `drizzle-kit@0.31.8` (dev)

2. **Configuration erstellt**
   - `drizzle.config.ts` - Drizzle Kit Config
   - Schema Output: `packages/database/drizzle/`
   - Source Schema: `packages/database/src/schema/`

3. **Schema aus DB generiert**
   - ✅ 37 Tabellen
   - ✅ 481 Spalten
   - ✅ 122 Indexe
   - ✅ 37 Foreign Keys
   - ✅ 13 RLS Policies
   - ✅ 39 Check Constraints

4. **Drizzle Client erstellt**
   - `packages/database/src/drizzle-client.ts`
   - Mit RLS-Support (`withRLS` helper)
   - Logger für Development

5. **Proof-of-Concept: Favorites Router**
   - `apps/api/src/routers/favorites-drizzle.ts`
   - Alle 6 Procedures migriert
   - Tests erstellt für Vergleich old vs new

## Verwendung

### Basic Query

```typescript
import { db } from '@rendito/database/drizzle-client';
import { favorites } from '@rendito/database/schema';
import { eq } from 'drizzle-orm';

// SELECT
const userFavorites = await db
  .select()
  .from(favorites)
  .where(eq(favorites.userId, userId));

// INSERT
const newFavorite = await db
  .insert(favorites)
  .values({ userId, propertyId })
  .returning();

// DELETE
await db
  .delete(favorites)
  .where(eq(favorites.id, favoriteId));
```

### Mit RLS Context

```typescript
import { withRLS } from '@rendito/database/drizzle-client';

const result = await withRLS(userId, async (db) => {
  return await db
    .select()
    .from(properties)
    .where(eq(properties.userId, userId));
});
```

### Raw SQL (für komplexe Queries)

```typescript
import { sql } from '@rendito/database/drizzle-client';

const result = await sql`
  SELECT p.*, COUNT(f.id) as favorite_count
  FROM properties p
  LEFT JOIN favorites f ON f.property_id = p.id
  WHERE p.city = ${city}
  GROUP BY p.id
`;
```

## Nächste Schritte

### Router Migration Priorität

1. ✅ **favorites** - Fertig (Proof-of-Concept)
2. **dismissed** - Ähnlich wie favorites, einfach
3. **consents** - Simple CRUD
4. **user-preferences** - Mittel-komplex
5. **properties** (Read-Only) - Komplex, viele Queries
6. **portfolio** - Sehr komplex, viele Aggregationen

### Scripts

```bash
# Drizzle Studio (GUI)
cd packages/database
pnpm db:studio

# Schema neu generieren (nach DB-Änderungen)
pnpm db:introspect

# Migrations generieren
pnpm db:generate

# Push Schema zu DB (Development)
pnpm db:push
```

## Vorteile gegenüber raw pg

✅ **Type Safety** - Compile-Zeit Fehler statt Runtime
✅ **Autovervollständigung** - IDE unterstützt alle Columns
✅ **Refactoring-sicher** - Rename propagiert automatisch
✅ **Performance** - Identisch zu raw SQL
✅ **Migrations** - Automatisch aus Schema generiert
✅ **Developer Experience** - Schnellere Entwicklung

## Vergleich: Old vs New

### Old (pg)
```typescript
const result = await query(
  'SELECT * FROM favorites WHERE user_id = $1',
  [userId]
);
// result: any[]
```

### New (Drizzle)
```typescript
const result = await db
  .select()
  .from(favorites)
  .where(eq(favorites.userId, userId));
// result: Favorite[]
```

## Troubleshooting

### SSL Error
```
Error: The server does not support SSL connections
```
**Lösung:** `ssl: false` in `drizzle.config.ts` hinzufügen (bereits erledigt)

### Type Errors
```
Cannot find module '@rendito/database/schema'
```
**Lösung:**
```bash
cd packages/database
pnpm type-check
```

### Connection Issues
```bash
# Test Drizzle connection
cd apps/api
node -e "import('./src/db-test.js')"
```

## Migration Checklist

### Pro Router:
- [ ] Schema-Imports hinzufügen
- [ ] Queries zu Drizzle konvertieren
- [ ] Raw SQL für komplexe Aggregationen
- [ ] Tests schreiben (old vs new)
- [ ] Tests passed
- [ ] Manual Testing
- [ ] Code Review
- [ ] Deploy

## Status

| Router | Status | Notes |
|--------|--------|-------|
| favorites | ✅ Migriert | Proof-of-Concept |
| dismissed | ✅ Migriert | 4 Procedures |
| consents | ✅ Migriert | 5 Procedures, complex logic |
| search-history | ✅ Migriert | 4 Procedures, full Drizzle |
| user-preferences | ✅ Migriert | 3 Procedures, JSON handling |
| recommendations | ✅ Migriert | 6 Procedures, service-based |
| auth | ✅ Migriert | 5 Procedures, JWT + bcrypt |
| sellers | ✅ Migriert | 1 Procedure, complex aggregations |
| userPropertyParameters | ✅ Migriert | 3 Procedures, UPSERT logic |
| messaging | 🟡 Todo | Message CRUD |
| document-access | 🟡 Todo | 11 Procedures |
| properties | 🔴 Todo | Viele komplexe Queries |
| portfolio | 🔴 Todo | Sehr komplex |
| evaluations | 🔴 Todo | Complex calculations |

---

**Total Progress:** 9/20 Router migriert (45%)
**Phase:** Router-by-Router Migration in Progress 🚀
**Nächster Schritt:** document-access, messaging Router

## Recent Changes

### 2026-01-08: Dismissed Router Migration ✅

**Files Created:**
- `apps/api/src/routers/dismissed-drizzle.ts` - Migrated router
- `apps/api/src/routers/__tests__/dismissed-drizzle-migration.test.ts` - Tests

**Procedures Migrated:**
1. ✅ `dismiss` - Insert with ON CONFLICT DO NOTHING
2. ✅ `undismiss` - Delete dismissed property
3. ✅ `isDismissed` - Check if property is dismissed
4. ✅ `getAll` - Get all dismissed properties with JOIN

**Key Learnings:**
- `onConflictDoNothing()` works perfectly in Drizzle
- Complex JOINs with JSON aggregation kept as raw SQL
- Same pattern as favorites router - very straightforward

**Next Steps:**
- Consents router (simple CRUD)
- User preferences router (more complex)

### 2026-01-08: Batch 2 - Three More Routers ✅

**Files Created:**
- `apps/api/src/routers/consents-drizzle.ts` → `consents.ts`
- `apps/api/src/routers/search-history-drizzle.ts` → `search-history.ts`
- `apps/api/src/routers/user-preferences-drizzle.ts` → `user-preferences.ts`

**Consents Router (5 Procedures):**
- Complex INSERT with document access logic
- ON CONFLICT DO UPDATE kept as raw SQL
- Type-safe SELECT/UPDATE operations

**Search History Router (4 Procedures):**
- Full Drizzle migration (no raw SQL)
- ORDER BY DESC for sorting
- Conditional INSERT vs UPDATE

**User Preferences Router (3 Procedures):**
- Complex JSON parsing preserved
- Raw SQL for calculate_user_preferences() function
- Drizzle handles JSONB automatically

**Progress:** 5/20 routers (25%) ✅

### 2026-01-08: Batch 3 - Four More Routers ✅

**Files Activated:**
- `apps/api/src/routers/recommendations.ts` - 6 Procedures
- `apps/api/src/routers/auth.ts` - 5 Procedures
- `apps/api/src/routers/sellers.ts` - 1 Procedure
- `apps/api/src/routers/userPropertyParameters.ts` - 3 Procedures

**Recommendations Router (6 Procedures):**
- Service-based architecture (getPersonalizedFeed, getTrendingProperties)
- Drizzle for simple queries (properties, user_preferences)
- Raw SQL for calculate_user_preferences() function
- Parallel COUNT queries with Drizzle

**Auth Router (5 Procedures):**
- register: Drizzle INSERT for users + user_profiles
- login: Drizzle SELECT with password verification
- getProfile: Raw SQL JOIN for users + user_profiles
- updateProfile: Dynamic Drizzle UPDATE
- createProviderAccount: Complex multi-table INSERT

**Sellers Router (1 Procedure):**
- Complex aggregations kept as raw SQL
- FILTER, EXISTS, COUNT(DISTINCT) patterns
- Parallel queries for performance

**UserPropertyParameters Router (3 Procedures):**
- get: Simple Drizzle SELECT
- upsert: Complex ON CONFLICT DO UPDATE as raw SQL
- delete: Drizzle DELETE

**Progress:** 9/20 routers (45%) ✅
