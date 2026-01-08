import { relations } from "drizzle-orm/relations";
import { users, searchHistory, properties, userDismissedProperties, propertyInteractions, userPreferences, propertyConsents, favorites, bookings, propertyTrending, subscriptions, userProfiles, conversations, propertyAiEvaluations, propertyStatistics, paymentEvents, oneTimePayments, messages, documentAccessRequests, portfolioProperties, portfolioValueHistory, taxOptimizerProfiles, sellerKnowledgeBase, interestRateUpdates, interestRateMatrix, interestRatePropertyValueAdjustments, calculatorDefaults, calculatorDefaultsHistory, userCredits, userCalculatorPreferences, propertyProviderContacts, userPropertyParameters, propertySimilarities, recommendationsCache } from "./schema";

export const searchHistoryRelations = relations(searchHistory, ({one}) => ({
	user: one(users, {
		fields: [searchHistory.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	searchHistories: many(searchHistory),
	userDismissedProperties: many(userDismissedProperties),
	propertyInteractions: many(propertyInteractions),
	userPreferences: many(userPreferences),
	propertyConsents: many(propertyConsents),
	favorites: many(favorites),
	bookings_ownerId: many(bookings, {
		relationName: "bookings_ownerId_users_id"
	}),
	bookings_userId: many(bookings, {
		relationName: "bookings_userId_users_id"
	}),
	subscriptions: many(subscriptions),
	userProfiles: many(userProfiles),
	paymentEvents: many(paymentEvents),
	oneTimePayments: many(oneTimePayments),
	portfolioProperties: many(portfolioProperties),
	taxOptimizerProfiles: many(taxOptimizerProfiles),
	sellerKnowledgeBases: many(sellerKnowledgeBase),
	userCredits: many(userCredits),
	userCalculatorPreferences: many(userCalculatorPreferences),
	propertyProviderContacts_createdByUserId: many(propertyProviderContacts, {
		relationName: "propertyProviderContacts_createdByUserId_users_id"
	}),
	propertyProviderContacts_linkedUserId: many(propertyProviderContacts, {
		relationName: "propertyProviderContacts_linkedUserId_users_id"
	}),
	userPropertyParameters: many(userPropertyParameters),
	properties: many(properties),
	recommendationsCaches: many(recommendationsCache),
}));

export const userDismissedPropertiesRelations = relations(userDismissedProperties, ({one}) => ({
	property: one(properties, {
		fields: [userDismissedProperties.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [userDismissedProperties.userId],
		references: [users.id]
	}),
}));

export const propertiesRelations = relations(properties, ({one, many}) => ({
	userDismissedProperties: many(userDismissedProperties),
	propertyInteractions: many(propertyInteractions),
	propertyConsents: many(propertyConsents),
	favorites: many(favorites),
	bookings: many(bookings),
	propertyTrendings: many(propertyTrending),
	conversations: many(conversations),
	propertyAiEvaluations: many(propertyAiEvaluations),
	propertyStatistics: many(propertyStatistics),
	oneTimePayments: many(oneTimePayments),
	documentAccessRequests: many(documentAccessRequests),
	sellerKnowledgeBases: many(sellerKnowledgeBase),
	propertyProviderContacts: many(propertyProviderContacts),
	userPropertyParameters: many(userPropertyParameters),
	user: one(users, {
		fields: [properties.userId],
		references: [users.id]
	}),
	propertySimilarities_propertyAId: many(propertySimilarities, {
		relationName: "propertySimilarities_propertyAId_properties_id"
	}),
	propertySimilarities_propertyBId: many(propertySimilarities, {
		relationName: "propertySimilarities_propertyBId_properties_id"
	}),
	recommendationsCaches: many(recommendationsCache),
}));

export const propertyInteractionsRelations = relations(propertyInteractions, ({one}) => ({
	property: one(properties, {
		fields: [propertyInteractions.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [propertyInteractions.userId],
		references: [users.id]
	}),
}));

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
	user: one(users, {
		fields: [userPreferences.userId],
		references: [users.id]
	}),
}));

export const propertyConsentsRelations = relations(propertyConsents, ({one}) => ({
	property: one(properties, {
		fields: [propertyConsents.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [propertyConsents.userId],
		references: [users.id]
	}),
}));

export const favoritesRelations = relations(favorites, ({one}) => ({
	property: one(properties, {
		fields: [favorites.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id]
	}),
}));

export const bookingsRelations = relations(bookings, ({one}) => ({
	user_ownerId: one(users, {
		fields: [bookings.ownerId],
		references: [users.id],
		relationName: "bookings_ownerId_users_id"
	}),
	property: one(properties, {
		fields: [bookings.propertyId],
		references: [properties.id]
	}),
	user_userId: one(users, {
		fields: [bookings.userId],
		references: [users.id],
		relationName: "bookings_userId_users_id"
	}),
}));

export const propertyTrendingRelations = relations(propertyTrending, ({one}) => ({
	property: one(properties, {
		fields: [propertyTrending.propertyId],
		references: [properties.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	userProfile_buyerId: one(userProfiles, {
		fields: [conversations.buyerId],
		references: [userProfiles.id],
		relationName: "conversations_buyerId_userProfiles_id"
	}),
	property: one(properties, {
		fields: [conversations.propertyId],
		references: [properties.id]
	}),
	userProfile_sellerId: one(userProfiles, {
		fields: [conversations.sellerId],
		references: [userProfiles.id],
		relationName: "conversations_sellerId_userProfiles_id"
	}),
	messages: many(messages),
}));

export const userProfilesRelations = relations(userProfiles, ({one, many}) => ({
	conversations_buyerId: many(conversations, {
		relationName: "conversations_buyerId_userProfiles_id"
	}),
	conversations_sellerId: many(conversations, {
		relationName: "conversations_sellerId_userProfiles_id"
	}),
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
	messages: many(messages),
}));

export const propertyAiEvaluationsRelations = relations(propertyAiEvaluations, ({one}) => ({
	property: one(properties, {
		fields: [propertyAiEvaluations.propertyId],
		references: [properties.id]
	}),
}));

export const propertyStatisticsRelations = relations(propertyStatistics, ({one}) => ({
	property: one(properties, {
		fields: [propertyStatistics.propertyId],
		references: [properties.id]
	}),
}));

export const paymentEventsRelations = relations(paymentEvents, ({one}) => ({
	user: one(users, {
		fields: [paymentEvents.userId],
		references: [users.id]
	}),
}));

export const oneTimePaymentsRelations = relations(oneTimePayments, ({one}) => ({
	property: one(properties, {
		fields: [oneTimePayments.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [oneTimePayments.userId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	userProfile: one(userProfiles, {
		fields: [messages.senderId],
		references: [userProfiles.id]
	}),
}));

export const documentAccessRequestsRelations = relations(documentAccessRequests, ({one}) => ({
	property: one(properties, {
		fields: [documentAccessRequests.propertyId],
		references: [properties.id]
	}),
}));

export const portfolioValueHistoryRelations = relations(portfolioValueHistory, ({one}) => ({
	portfolioProperty: one(portfolioProperties, {
		fields: [portfolioValueHistory.portfolioPropertyId],
		references: [portfolioProperties.id]
	}),
}));

export const portfolioPropertiesRelations = relations(portfolioProperties, ({one, many}) => ({
	portfolioValueHistories: many(portfolioValueHistory),
	user: one(users, {
		fields: [portfolioProperties.userId],
		references: [users.id]
	}),
}));

export const taxOptimizerProfilesRelations = relations(taxOptimizerProfiles, ({one}) => ({
	user: one(users, {
		fields: [taxOptimizerProfiles.userId],
		references: [users.id]
	}),
}));

export const sellerKnowledgeBaseRelations = relations(sellerKnowledgeBase, ({one}) => ({
	property: one(properties, {
		fields: [sellerKnowledgeBase.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [sellerKnowledgeBase.userId],
		references: [users.id]
	}),
}));

export const interestRateMatrixRelations = relations(interestRateMatrix, ({one}) => ({
	interestRateUpdate: one(interestRateUpdates, {
		fields: [interestRateMatrix.updateId],
		references: [interestRateUpdates.id]
	}),
}));

export const interestRateUpdatesRelations = relations(interestRateUpdates, ({many}) => ({
	interestRateMatrices: many(interestRateMatrix),
	interestRatePropertyValueAdjustments: many(interestRatePropertyValueAdjustments),
}));

export const interestRatePropertyValueAdjustmentsRelations = relations(interestRatePropertyValueAdjustments, ({one}) => ({
	interestRateUpdate: one(interestRateUpdates, {
		fields: [interestRatePropertyValueAdjustments.updateId],
		references: [interestRateUpdates.id]
	}),
}));

export const calculatorDefaultsHistoryRelations = relations(calculatorDefaultsHistory, ({one}) => ({
	calculatorDefault: one(calculatorDefaults, {
		fields: [calculatorDefaultsHistory.defaultsId],
		references: [calculatorDefaults.id]
	}),
}));

export const calculatorDefaultsRelations = relations(calculatorDefaults, ({many}) => ({
	calculatorDefaultsHistories: many(calculatorDefaultsHistory),
}));

export const userCreditsRelations = relations(userCredits, ({one}) => ({
	user: one(users, {
		fields: [userCredits.userId],
		references: [users.id]
	}),
}));

export const userCalculatorPreferencesRelations = relations(userCalculatorPreferences, ({one}) => ({
	user: one(users, {
		fields: [userCalculatorPreferences.userId],
		references: [users.id]
	}),
}));

export const propertyProviderContactsRelations = relations(propertyProviderContacts, ({one}) => ({
	user_createdByUserId: one(users, {
		fields: [propertyProviderContacts.createdByUserId],
		references: [users.id],
		relationName: "propertyProviderContacts_createdByUserId_users_id"
	}),
	user_linkedUserId: one(users, {
		fields: [propertyProviderContacts.linkedUserId],
		references: [users.id],
		relationName: "propertyProviderContacts_linkedUserId_users_id"
	}),
	property: one(properties, {
		fields: [propertyProviderContacts.propertyId],
		references: [properties.id]
	}),
}));

export const userPropertyParametersRelations = relations(userPropertyParameters, ({one}) => ({
	property: one(properties, {
		fields: [userPropertyParameters.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [userPropertyParameters.userId],
		references: [users.id]
	}),
}));

export const propertySimilaritiesRelations = relations(propertySimilarities, ({one}) => ({
	property_propertyAId: one(properties, {
		fields: [propertySimilarities.propertyAId],
		references: [properties.id],
		relationName: "propertySimilarities_propertyAId_properties_id"
	}),
	property_propertyBId: one(properties, {
		fields: [propertySimilarities.propertyBId],
		references: [properties.id],
		relationName: "propertySimilarities_propertyBId_properties_id"
	}),
}));

export const recommendationsCacheRelations = relations(recommendationsCache, ({one}) => ({
	property: one(properties, {
		fields: [recommendationsCache.propertyId],
		references: [properties.id]
	}),
	user: one(users, {
		fields: [recommendationsCache.userId],
		references: [users.id]
	}),
}));