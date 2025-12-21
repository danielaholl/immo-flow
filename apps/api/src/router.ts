/**
 * Main tRPC App Router
 * Combines all sub-routers
 */
import { router } from './trpc.js';
import { authRouter } from './routers/auth.js';
import { propertiesRouter } from './routers/properties.js';
import { favoritesRouter } from './routers/favorites.js';
import { dismissedRouter } from './routers/dismissed.js';
import { consentsRouter } from './routers/consents.js';
import { evaluationsRouter } from './routers/evaluations.js';
import { aiChatRouter } from './routers/ai-chat.js';
import { storageRouter } from './routers/storage.js';
import { messagingRouter } from './routers/messaging.js';
import { recommendationsRouter } from './routers/recommendations.js';
import { searchHistoryRouter } from './routers/search-history.js';
import { userPreferencesRouter } from './routers/user-preferences.js';
import { aiSearchRouter } from './routers/ai-search.js';
import { documentAccessRouter } from './routers/document-access.js';
import { userPropertyParametersRouter } from './routers/userPropertyParameters.js';
import { paymentsRouter } from './routers/payments.js';

export const appRouter = router({
  auth: authRouter,
  properties: propertiesRouter,
  favorites: favoritesRouter,
  dismissed: dismissedRouter,
  consents: consentsRouter,
  evaluations: evaluationsRouter,
  aiChat: aiChatRouter,
  storage: storageRouter,
  messaging: messagingRouter,
  recommendations: recommendationsRouter,
  searchHistory: searchHistoryRouter,
  userPreferences: userPreferencesRouter,
  aiSearch: aiSearchRouter,
  documentAccess: documentAccessRouter,
  userPropertyParameters: userPropertyParametersRouter,
  payments: paymentsRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
