import { pgTable, index, unique, uuid, text, boolean, timestamp, foreignKey, jsonb, integer, check, numeric, pgPolicy, uniqueIndex, varchar, date, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	emailConfirmed: boolean("email_confirmed").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_key").on(table.email),
]);

export const searchHistory = pgTable("search_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	query: text().notNull(),
	criteria: jsonb().default({}),
	resultsCount: integer("results_count").default(0),
	lastSearchedAt: timestamp("last_searched_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_search_history_criteria_gin").using("gin", table.criteria.asc().nullsLast().op("jsonb_ops")),
	index("idx_search_history_last_searched").using("btree", table.lastSearchedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_search_history_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_search_history_user_recent").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.lastSearchedAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "search_history_user_id_fkey"
		}).onDelete("cascade"),
]);

export const userDismissedProperties = pgTable("user_dismissed_properties", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	propertyId: uuid("property_id").notNull(),
	dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	reason: text(),
}, (table) => [
	index("idx_dismissed_properties_count").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_dismissed_dismissed_at").using("btree", table.dismissedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_user_dismissed_property_id").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_dismissed_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "user_dismissed_properties_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_dismissed_properties_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_dismissed_properties_user_id_property_id_key").on(table.userId, table.propertyId),
]);

export const propertyInteractions = pgTable("property_interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	propertyId: uuid("property_id").notNull(),
	interactionType: text("interaction_type").notNull(),
	dwellTimeSeconds: integer("dwell_time_seconds").default(0),
	source: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_interactions_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_property_interactions_property_id").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_property_interactions_share").using("btree", table.propertyId.asc().nullsLast().op("text_ops"), table.interactionType.asc().nullsLast().op("uuid_ops")).where(sql`(interaction_type = 'share'::text)`),
	index("idx_property_interactions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "property_interactions_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "property_interactions_user_id_fkey"
		}).onDelete("cascade"),
	check("property_interactions_interaction_type_check", sql`interaction_type = ANY (ARRAY['view'::text, 'favorite'::text, 'unfavorite'::text, 'search_click'::text, 'share'::text, 'booking'::text])`),
]);

export const userPreferences = pgTable("user_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	preferredLocations: jsonb("preferred_locations").default([]),
	priceRange: jsonb("price_range").default({}),
	preferredRooms: jsonb("preferred_rooms").default([]),
	preferredFeatures: jsonb("preferred_features").default([]),
	interactionCount: integer("interaction_count").default(0),
	lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	minPrice: numeric("min_price"),
	maxPrice: numeric("max_price"),
}, (table) => [
	index("idx_user_preferences_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_preferences_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_preferences_user_id_key").on(table.userId),
]);

export const propertyConsents = pgTable("property_consents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	propertyId: uuid("property_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_consents_property_id").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_property_consents_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "property_consents_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "property_consents_user_id_fkey"
		}).onDelete("cascade"),
	unique("property_consents_user_id_property_id_key").on(table.userId, table.propertyId),
]);

export const favorites = pgTable("favorites", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	propertyId: uuid("property_id").notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("favorites_property_id_idx").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("favorites_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_favorites_user_property").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.propertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "favorites_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "favorites_user_id_fkey"
		}).onDelete("cascade"),
	unique("favorites_property_id_user_id_key").on(table.propertyId, table.userId),
	pgPolicy("Users can manage their own favorites", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(user_id = current_user_id())`, withCheck: sql`(user_id = current_user_id())`  }),
	pgPolicy("Users can view their own favorites", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const bookings = pgTable("bookings", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	propertyId: uuid("property_id").notNull(),
	userId: uuid("user_id").notNull(),
	date: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	status: text().default('pending'),
	message: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	ownerId: uuid("owner_id"),
}, (table) => [
	index("bookings_date_idx").using("btree", table.date.asc().nullsLast().op("timestamptz_ops")),
	index("bookings_property_id_idx").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("bookings_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("bookings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "bookings_owner_id_fkey"
		}),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "bookings_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bookings_user_id_fkey"
		}).onDelete("cascade"),
	unique("bookings_property_id_date_key").on(table.propertyId, table.date),
	pgPolicy("Users can update their own bookings", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(user_id = current_user_id())`, withCheck: sql`(user_id = current_user_id())`  }),
	pgPolicy("Users can create bookings", { as: "permissive", for: "insert", to: ["authenticated"] }),
	check("bookings_status_check", sql`status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])`),
]);

export const propertyTrending = pgTable("property_trending", {
	propertyId: uuid("property_id").primaryKey().notNull(),
	viewsLast7D: integer("views_last_7d").default(0),
	favoritesLast7D: integer("favorites_last_7d").default(0),
	contactsLast7D: integer("contacts_last_7d").default(0),
	sharesLast7D: integer("shares_last_7d").default(0),
	trendingScore: numeric("trending_score", { precision: 10, scale:  2 }).default('0'),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_trending_score").using("btree", table.trendingScore.desc().nullsFirst().op("numeric_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "property_trending_property_id_fkey"
		}).onDelete("cascade"),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripePriceId: text("stripe_price_id"),
	planType: text("plan_type").default('free').notNull(),
	status: text().default('active').notNull(),
	currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_subscriptions_plan_type").using("btree", table.planType.asc().nullsLast().op("text_ops")),
	index("idx_subscriptions_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_subscriptions_stripe_customer").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	index("idx_subscriptions_stripe_subscription").using("btree", table.stripeSubscriptionId.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_subscriptions_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	propertyId: uuid("property_id").notNull(),
	buyerId: uuid("buyer_id").notNull(),
	sellerId: uuid("seller_id").notNull(),
	buyerUnreadCount: integer("buyer_unread_count").default(0),
	sellerUnreadCount: integer("seller_unread_count").default(0),
	lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_conversations_buyer").using("btree", table.buyerId.asc().nullsLast().op("uuid_ops")),
	index("idx_conversations_last_message").using("btree", table.lastMessageAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_conversations_property").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_conversations_property_count").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_conversations_seller").using("btree", table.sellerId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.buyerId],
			foreignColumns: [userProfiles.id],
			name: "conversations_buyer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "conversations_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [userProfiles.id],
			name: "conversations_seller_id_fkey"
		}).onDelete("cascade"),
	unique("conversations_property_id_buyer_id_key").on(table.propertyId, table.buyerId),
	pgPolicy("Users can view conversations they participate in", { as: "permissive", for: "select", to: ["authenticated"], using: sql`((buyer_id IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.user_id = current_user_id()))) OR (seller_id IN ( SELECT user_profiles.id
   FROM user_profiles
  WHERE (user_profiles.user_id = current_user_id()))))` }),
	check("conversations_buyer_unread_count_check", sql`buyer_unread_count >= 0`),
	check("conversations_check", sql`buyer_id <> seller_id`),
	check("conversations_seller_unread_count_check", sql`seller_unread_count >= 0`),
]);

export const propertyAiEvaluations = pgTable("property_ai_evaluations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	propertyId: uuid("property_id").notNull(),
	overallScore: integer("overall_score").notNull(),
	colorRating: text("color_rating").notNull(),
	locationScore: integer("location_score"),
	priceScore: integer("price_score"),
	yieldScore: integer("yield_score"),
	appreciationScore: integer("appreciation_score"),
	featuresScore: integer("features_score"),
	aiReasoning: text("ai_reasoning"),
	marketAnalysis: text("market_analysis"),
	rentAnalysis: text("rent_analysis"),
	financingAnalysis: text("financing_analysis"),
	estimatedMonthlyRent: numeric("estimated_monthly_rent", { precision: 10, scale:  2 }),
	estimatedYearlyRent: numeric("estimated_yearly_rent", { precision: 10, scale:  2 }),
	grossYieldPercentage: numeric("gross_yield_percentage", { precision: 5, scale:  2 }),
	pricePerSqm: numeric("price_per_sqm", { precision: 10, scale:  2 }),
	marketAveragePricePerSqm: numeric("market_average_price_per_sqm", { precision: 10, scale:  2 }),
	interestRate90: numeric("interest_rate_90", { precision: 5, scale:  2 }),
	interestRate80: numeric("interest_rate_80", { precision: 5, scale:  2 }),
	aiModel: text("ai_model"),
	evaluationVersion: text("evaluation_version"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_property_ai_evaluations_property_id").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "property_ai_evaluations_property_id_fkey"
		}).onDelete("cascade"),
	unique("property_ai_evaluations_property_id_key").on(table.propertyId),
	check("property_ai_evaluations_appreciation_score_check", sql`(appreciation_score >= 0) AND (appreciation_score <= 100)`),
	check("property_ai_evaluations_color_rating_check", sql`color_rating = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text])`),
	check("property_ai_evaluations_features_score_check", sql`(features_score >= 0) AND (features_score <= 100)`),
	check("property_ai_evaluations_location_score_check", sql`(location_score >= 0) AND (location_score <= 100)`),
	check("property_ai_evaluations_overall_score_check", sql`(overall_score >= 0) AND (overall_score <= 100)`),
	check("property_ai_evaluations_price_score_check", sql`(price_score >= 0) AND (price_score <= 100)`),
	check("property_ai_evaluations_yield_score_check", sql`(yield_score >= 0) AND (yield_score <= 100)`),
]);

export const userProfiles = pgTable("user_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	phone: text(),
	avatarUrl: text("avatar_url"),
	bio: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	address: text(),
	company: text(),
}, (table) => [
	index("idx_user_profiles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_profiles_user_id_key").on(table.userId),
	pgPolicy("Users can update own profile", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(user_id = current_user_id())`, withCheck: sql`(user_id = current_user_id())`  }),
	pgPolicy("Users can view own profile", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Users can insert own profile", { as: "permissive", for: "insert", to: ["authenticated"] }),
]);

export const propertyStatistics = pgTable("property_statistics", {
	propertyId: uuid("property_id").primaryKey().notNull(),
	totalViews: integer("total_views").default(0),
	uniqueViewers: integer("unique_viewers").default(0),
	favoritesCount: integer("favorites_count").default(0),
	viewsLast7Days: integer("views_last_7_days").default(0),
	viewsLast30Days: integer("views_last_30_days").default(0),
	feedbackCount: integer("feedback_count").default(0),
	avgRating: numeric("avg_rating", { precision: 3, scale:  2 }),
	avgPriceRating: numeric("avg_price_rating", { precision: 3, scale:  2 }),
	avgLocationRating: numeric("avg_location_rating", { precision: 3, scale:  2 }),
	avgConditionRating: numeric("avg_condition_rating", { precision: 3, scale:  2 }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	ratingCount: integer("rating_count").default(0),
	avgSuggestedPrice: numeric("avg_suggested_price", { precision: 12, scale:  2 }),
	positiveFeedbackCount: integer("positive_feedback_count").default(0),
	neutralFeedbackCount: integer("neutral_feedback_count").default(0),
	negativeFeedbackCount: integer("negative_feedback_count").default(0),
}, (table) => [
	index("idx_property_statistics_favorites").using("btree", table.favoritesCount.desc().nullsFirst().op("int4_ops")),
	index("idx_property_statistics_views").using("btree", table.totalViews.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "property_statistics_property_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Property owners can update their statistics", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(property_id IN ( SELECT properties.id
   FROM properties
  WHERE (properties.user_id = current_user_id())))` }),
	pgPolicy("Anyone can view property statistics", { as: "permissive", for: "select", to: ["public"] }),
	check("property_statistics_avg_condition_rating_check", sql`(avg_condition_rating IS NULL) OR ((avg_condition_rating >= (0)::numeric) AND (avg_condition_rating <= (5)::numeric))`),
	check("property_statistics_avg_location_rating_check", sql`(avg_location_rating IS NULL) OR ((avg_location_rating >= (0)::numeric) AND (avg_location_rating <= (5)::numeric))`),
	check("property_statistics_avg_price_rating_check", sql`(avg_price_rating IS NULL) OR ((avg_price_rating >= (0)::numeric) AND (avg_price_rating <= (5)::numeric))`),
	check("property_statistics_avg_rating_check", sql`(avg_rating IS NULL) OR ((avg_rating >= (0)::numeric) AND (avg_rating <= (5)::numeric))`),
	check("property_statistics_avg_suggested_price_check", sql`(avg_suggested_price IS NULL) OR (avg_suggested_price >= (0)::numeric)`),
	check("property_statistics_favorites_count_check", sql`favorites_count >= 0`),
	check("property_statistics_feedback_count_check", sql`feedback_count >= 0`),
	check("property_statistics_negative_feedback_count_check", sql`negative_feedback_count >= 0`),
	check("property_statistics_neutral_feedback_count_check", sql`neutral_feedback_count >= 0`),
	check("property_statistics_positive_feedback_count_check", sql`positive_feedback_count >= 0`),
	check("property_statistics_rating_count_check", sql`rating_count >= 0`),
	check("property_statistics_total_views_check", sql`total_views >= 0`),
	check("property_statistics_unique_viewers_check", sql`unique_viewers >= 0`),
	check("property_statistics_views_last_30_days_check", sql`views_last_30_days >= 0`),
	check("property_statistics_views_last_7_days_check", sql`views_last_7_days >= 0`),
]);

export const paymentEvents = pgTable("payment_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	stripeEventId: text("stripe_event_id").notNull(),
	eventType: text("event_type").notNull(),
	payload: jsonb(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payment_events_processed").using("btree", table.processedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_payment_events_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("idx_payment_events_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payment_events_user_id_fkey"
		}).onDelete("set null"),
	unique("payment_events_stripe_event_id_key").on(table.stripeEventId),
]);

export const oneTimePayments = pgTable("one_time_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	productType: text("product_type").notNull(),
	amountCents: integer("amount_cents").notNull(),
	currency: text().default('eur').notNull(),
	status: text().default('pending').notNull(),
	propertyId: uuid("property_id"),
	successFeePercentage: numeric("success_fee_percentage", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_one_time_payments_property").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_one_time_payments_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_one_time_payments_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "one_time_payments_property_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "one_time_payments_user_id_fkey"
		}).onDelete("cascade"),
	unique("one_time_payments_stripe_payment_intent_id_key").on(table.stripePaymentIntentId),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	senderId: uuid("sender_id"),
	senderType: text("sender_type").notNull(),
	content: text().notNull(),
	isAiGenerated: boolean("is_ai_generated").default(false),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	aiConfidence: numeric("ai_confidence", { precision: 3, scale:  2 }),
	forwardedToSeller: boolean("forwarded_to_seller").default(false),
	attachments: jsonb().default([]),
}, (table) => [
	index("idx_messages_conversation").using("btree", table.conversationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_messages_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_messages_has_attachments").using("btree", sql`((attachments <> '[]'::jsonb))`),
	index("idx_messages_sender").using("btree", table.senderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [userProfiles.id],
			name: "messages_sender_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can insert messages in their conversations", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`(conversation_id IN ( SELECT conversations.id
   FROM conversations
  WHERE ((conversations.buyer_id IN ( SELECT user_profiles.id
           FROM user_profiles
          WHERE (user_profiles.user_id = current_user_id()))) OR (conversations.seller_id IN ( SELECT user_profiles.id
           FROM user_profiles
          WHERE (user_profiles.user_id = current_user_id()))))))`  }),
	pgPolicy("Users can view messages in their conversations", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("messages_ai_confidence_check", sql`(ai_confidence IS NULL) OR ((ai_confidence >= (0)::numeric) AND (ai_confidence <= (1)::numeric))`),
	check("messages_sender_type_check", sql`sender_type = ANY (ARRAY['buyer'::text, 'seller'::text, 'ai'::text])`),
]);

export const documentAccessRequests = pgTable("document_access_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	propertyId: uuid("property_id").notNull(),
	userId: uuid("user_id").notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	userFirstName: varchar("user_first_name", { length: 100 }),
	userLastName: varchar("user_last_name", { length: 100 }),
	userEmail: varchar("user_email", { length: 255 }).notNull(),
	userPhone: varchar("user_phone", { length: 50 }),
	requestedAt: timestamp("requested_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
	brokerResponseMessage: text("broker_response_message"),
	manualDocsApproved: boolean("manual_docs_approved").default(false),
	interestScore: integer("interest_score"),
}, (table) => [
	index("idx_document_access_requests_property").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_access_requests_status").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("idx_document_access_requests_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "document_access_requests_property_id_fkey"
		}).onDelete("cascade"),
	unique("document_access_requests_property_id_user_id_key").on(table.propertyId, table.userId),
	check("document_access_requests_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'denied'::character varying])::text[])`),
	check("interest_score_range", sql`(interest_score IS NULL) OR ((interest_score >= 0) AND (interest_score <= 10))`),
]);

export const portfolioValueHistory = pgTable("portfolio_value_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	portfolioPropertyId: uuid("portfolio_property_id").notNull(),
	propertyValue: numeric("property_value", { precision: 14, scale:  2 }).notNull(),
	monthlyRent: numeric("monthly_rent", { precision: 10, scale:  2 }),
	remainingLoan: numeric("remaining_loan", { precision: 14, scale:  2 }),
	source: varchar({ length: 50 }).default('manual').notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_portfolio_value_history_date").using("btree", table.recordedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_portfolio_value_history_property").using("btree", table.portfolioPropertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.portfolioPropertyId],
			foreignColumns: [portfolioProperties.id],
			name: "portfolio_value_history_portfolio_property_id_fkey"
		}).onDelete("cascade"),
]);

export const portfolioProperties = pgTable("portfolio_properties", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: varchar({ length: 200 }).notNull(),
	propertyType: varchar("property_type", { length: 50 }),
	location: varchar({ length: 200 }).notNull(),
	postalCode: varchar("postal_code", { length: 20 }),
	streetAddress: varchar("street_address", { length: 200 }),
	sqm: numeric({ precision: 10, scale:  2 }).notNull(),
	rooms: numeric({ precision: 4, scale:  1 }),
	yearBuilt: integer("year_built"),
	condition: varchar({ length: 50 }),
	purchaseDate: date("purchase_date"),
	purchasePrice: numeric("purchase_price", { precision: 14, scale:  2 }).notNull(),
	purchaseCosts: numeric("purchase_costs", { precision: 12, scale:  2 }),
	renovationCosts: numeric("renovation_costs", { precision: 12, scale:  2 }),
	currentValue: numeric("current_value", { precision: 14, scale:  2 }),
	valueUpdatedAt: timestamp("value_updated_at", { withTimezone: true, mode: 'string' }),
	loanAmount: numeric("loan_amount", { precision: 14, scale:  2 }),
	interestRate: numeric("interest_rate", { precision: 5, scale:  3 }),
	amortizationRate: numeric("amortization_rate", { precision: 5, scale:  3 }),
	loanStartDate: date("loan_start_date"),
	loanTermYears: integer("loan_term_years"),
	fixedRateUntil: date("fixed_rate_until"),
	monthlyRent: numeric("monthly_rent", { precision: 10, scale:  2 }),
	monthlyFee: numeric("monthly_fee", { precision: 10, scale:  2 }),
	vacancyRate: numeric("vacancy_rate", { precision: 5, scale:  2 }),
	notes: text(),
	images: text().array(),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	appreciationRatePa: numeric("appreciation_rate_pa", { precision: 5, scale:  2 }).default('1.0'),
	repaymentFreeYears: integer("repayment_free_years").default(0),
	buildingShare: numeric("building_share", { precision: 5, scale:  4 }).default('0.80'),
	aiScore: integer("ai_score"),
}, (table) => [
	index("idx_portfolio_properties_created").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_portfolio_properties_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_portfolio_properties_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "portfolio_properties_user_id_fkey"
		}).onDelete("cascade"),
	check("portfolio_properties_property_type_check", sql`(property_type)::text = ANY ((ARRAY['apartment'::character varying, 'house'::character varying, 'villa'::character varying, 'multi_family'::character varying, 'land'::character varying, 'commercial'::character varying, 'office'::character varying, 'retail'::character varying, 'industrial'::character varying, 'parking'::character varying])::text[])`),
]);

export const taxOptimizerProfiles = pgTable("tax_optimizer_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	annualTaxPaid: numeric("annual_tax_paid", { precision: 12, scale:  2 }),
	marginalTaxRate: numeric("marginal_tax_rate", { precision: 5, scale:  4 }).default('0.42'),
	ltvRatio: numeric("ltv_ratio", { precision: 5, scale:  4 }).default('1.0'),
	interestRate: numeric("interest_rate", { precision: 5, scale:  4 }).default('0.04'),
	rentalYield: numeric("rental_yield", { precision: 5, scale:  4 }).default('0.03'),
	maintenanceRate: numeric("maintenance_rate", { precision: 5, scale:  4 }).default('0.005'),
	preferredStrategy: text("preferred_strategy").default('bestand'),
	calculatedTargetPrice: numeric("calculated_target_price", { precision: 14, scale:  2 }),
	calculatedAnnualSavings: numeric("calculated_annual_savings", { precision: 12, scale:  2 }),
	calculatedMonthlyImprovement: numeric("calculated_monthly_improvement", { precision: 10, scale:  2 }),
	lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_tax_optimizer_profiles_target_price").using("btree", table.calculatedTargetPrice.asc().nullsLast().op("numeric_ops")).where(sql`(calculated_target_price IS NOT NULL)`),
	index("idx_tax_optimizer_profiles_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tax_optimizer_profiles_user_id_fkey"
		}).onDelete("cascade"),
	unique("tax_optimizer_profiles_user_id_key").on(table.userId),
	check("tax_optimizer_profiles_preferred_strategy_check", sql`preferred_strategy = ANY (ARRAY['bestand'::text, 'neubau'::text, 'denkmal'::text])`),
]);

export const sellerKnowledgeBase = pgTable("seller_knowledge_base", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	propertyId: uuid("property_id").notNull(),
	userId: uuid("user_id").notNull(),
	topic: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	sourceType: varchar("source_type", { length: 50 }).default('manual'),
	sourceMessageId: uuid("source_message_id"),
	category: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true),
	confidenceScore: numeric("confidence_score", { precision: 3, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_seller_knowledge_active").using("btree", table.propertyId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("uuid_ops")).where(sql`(is_active = true)`),
	index("idx_seller_knowledge_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_seller_knowledge_property").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_seller_knowledge_search").using("gin", sql`to_tsvector('german'::regconfig, (((topic)::text || ' '::text) `),
	index("idx_seller_knowledge_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "seller_knowledge_base_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "seller_knowledge_base_user_id_fkey"
		}).onDelete("cascade"),
	unique("seller_knowledge_base_property_id_topic_key").on(table.propertyId, table.topic),
	check("seller_knowledge_base_category_check", sql`(category)::text = ANY ((ARRAY['costs'::character varying, 'renovation'::character varying, 'legal'::character varying, 'technical'::character varying, 'neighborhood'::character varying, 'amenities'::character varying, 'other'::character varying])::text[])`),
	check("seller_knowledge_base_source_type_check", sql`(source_type)::text = ANY ((ARRAY['manual'::character varying, 'chat_learned'::character varying])::text[])`),
]);

export const interestRateHistory = pgTable("interest_rate_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	calendarWeek: integer("calendar_week").notNull(),
	year: integer().notNull(),
	snapshotDate: date("snapshot_date").notNull(),
	topRate: numeric("top_rate", { precision: 5, scale:  3 }).notNull(),
	avgRate10Y80Pct: numeric("avg_rate_10y_80pct", { precision: 5, scale:  3 }),
	avgRate10Y90Pct: numeric("avg_rate_10y_90pct", { precision: 5, scale:  3 }),
	avgRate15Y80Pct: numeric("avg_rate_15y_80pct", { precision: 5, scale:  3 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_interest_history_date").using("btree", table.snapshotDate.desc().nullsFirst().op("date_ops")),
	index("idx_interest_history_week_year").using("btree", table.year.desc().nullsFirst().op("int4_ops"), table.calendarWeek.desc().nullsFirst().op("int4_ops")),
	unique("interest_rate_history_calendar_week_year_key").on(table.calendarWeek, table.year),
	check("interest_rate_history_calendar_week_check", sql`(calendar_week >= 1) AND (calendar_week <= 53)`),
	check("interest_rate_history_year_check", sql`(year >= 2020) AND (year <= 2100)`),
]);

export const plzMarketDataHistory = pgTable("plz_market_data_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	plz: varchar({ length: 5 }).notNull(),
	avgPurchasePriceSqm: numeric("avg_purchase_price_sqm", { precision: 10, scale:  2 }),
	avgRentSqm: numeric("avg_rent_sqm", { precision: 8, scale:  2 }),
	snapshotDate: date("snapshot_date").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_plz_history_date").using("btree", table.snapshotDate.desc().nullsFirst().op("date_ops")),
	index("idx_plz_history_plz").using("btree", table.plz.asc().nullsLast().op("text_ops")),
	unique("plz_market_data_history_plz_snapshot_date_key").on(table.plz, table.snapshotDate),
]);

export const interestRateUpdates = pgTable("interest_rate_updates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	calendarWeek: integer("calendar_week").notNull(),
	year: integer().notNull(),
	uploadDate: timestamp("upload_date", { withTimezone: true, mode: 'string' }).defaultNow(),
	imageUrl: text("image_url"),
	topRate: numeric("top_rate", { precision: 5, scale:  3 }).notNull(),
	minRate: numeric("min_rate", { precision: 5, scale:  3 }),
	maxRate: numeric("max_rate", { precision: 5, scale:  3 }),
	status: varchar({ length: 20 }).default('processed'),
	errorMessage: text("error_message"),
	rawExtractedData: jsonb("raw_extracted_data"),
	extractionConfidence: numeric("extraction_confidence", { precision: 3, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_interest_updates_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_interest_updates_week_year").using("btree", table.year.desc().nullsFirst().op("int4_ops"), table.calendarWeek.desc().nullsFirst().op("int4_ops")),
	unique("interest_rate_updates_calendar_week_year_key").on(table.calendarWeek, table.year),
	check("interest_rate_updates_calendar_week_check", sql`(calendar_week >= 1) AND (calendar_week <= 53)`),
	check("interest_rate_updates_extraction_confidence_check", sql`(extraction_confidence >= (0)::numeric) AND (extraction_confidence <= (1)::numeric)`),
	check("interest_rate_updates_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'processed'::character varying, 'error'::character varying])::text[])`),
	check("interest_rate_updates_top_rate_check", sql`(top_rate > (0)::numeric) AND (top_rate < (20)::numeric)`),
	check("interest_rate_updates_year_check", sql`(year >= 2020) AND (year <= 2100)`),
]);

export const interestRateMatrix = pgTable("interest_rate_matrix", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	updateId: uuid("update_id").notNull(),
	loanToValue: integer("loan_to_value").notNull(),
	fixedRateYears: integer("fixed_rate_years").notNull(),
	interestRate: numeric("interest_rate", { precision: 5, scale:  3 }).notNull(),
	rateDelta: numeric("rate_delta", { precision: 5, scale:  3 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_interest_matrix_ltv_years").using("btree", table.loanToValue.asc().nullsLast().op("int4_ops"), table.fixedRateYears.asc().nullsLast().op("int4_ops")),
	index("idx_interest_matrix_update").using("btree", table.updateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.updateId],
			foreignColumns: [interestRateUpdates.id],
			name: "interest_rate_matrix_update_id_fkey"
		}).onDelete("cascade"),
	unique("interest_rate_matrix_update_id_loan_to_value_fixed_rate_yea_key").on(table.updateId, table.loanToValue, table.fixedRateYears),
	check("interest_rate_matrix_fixed_rate_years_check", sql`fixed_rate_years = ANY (ARRAY[5, 10, 15, 20, 30])`),
	check("interest_rate_matrix_interest_rate_check", sql`(interest_rate > (0)::numeric) AND (interest_rate < (20)::numeric)`),
	check("interest_rate_matrix_loan_to_value_check", sql`loan_to_value = ANY (ARRAY[50, 70, 80, 90, 100])`),
]);

export const interestRatePropertyValueAdjustments = pgTable("interest_rate_property_value_adjustments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	updateId: uuid("update_id").notNull(),
	propertyValueMin: integer("property_value_min").notNull(),
	propertyValueMax: integer("property_value_max"),
	rateAdjustment: numeric("rate_adjustment", { precision: 5, scale:  3 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_interest_adjustments_update").using("btree", table.updateId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.updateId],
			foreignColumns: [interestRateUpdates.id],
			name: "interest_rate_property_value_adjustments_update_id_fkey"
		}).onDelete("cascade"),
	unique("interest_rate_property_value_a_update_id_property_value_min_key").on(table.updateId, table.propertyValueMin),
	check("interest_rate_property_value_adjustmen_property_value_min_check", sql`property_value_min >= 0`),
	check("interest_rate_property_value_adjustments_check", sql`(property_value_max IS NULL) OR (property_value_max > property_value_min)`),
]);

export const calculatorDefaultsHistory = pgTable("calculator_defaults_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	defaultsId: uuid("defaults_id").notNull(),
	buildingRatioStandard: numeric("building_ratio_standard", { precision: 4, scale:  3 }),
	buildingRatioNeubau: numeric("building_ratio_neubau", { precision: 4, scale:  3 }),
	maintenanceCostPerSqm: numeric("maintenance_cost_per_sqm", { precision: 6, scale:  2 }),
	nonAllocableHausgeldRatio: numeric("non_allocable_hausgeld_ratio", { precision: 4, scale:  3 }),
	costIncreaseRate: numeric("cost_increase_rate", { precision: 4, scale:  3 }),
	rentIncreaseRate: numeric("rent_increase_rate", { precision: 4, scale:  3 }),
	valueAppreciationRate: numeric("value_appreciation_rate", { precision: 4, scale:  3 }),
	hausgeldPerSqmModern: numeric("hausgeld_per_sqm_modern", { precision: 5, scale:  2 }),
	hausgeldPerSqmOld: numeric("hausgeld_per_sqm_old", { precision: 5, scale:  2 }),
	changedBy: text("changed_by").notNull(),
	changeReason: text("change_reason"),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	equityPercentage: numeric("equity_percentage", { precision: 5, scale:  2 }),
	amortizationRate: numeric("amortization_rate", { precision: 4, scale:  2 }),
}, (table) => [
	index("idx_calculator_defaults_history_changed_at").using("btree", table.changedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_calculator_defaults_history_defaults_id").using("btree", table.defaultsId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.defaultsId],
			foreignColumns: [calculatorDefaults.id],
			name: "calculator_defaults_history_defaults_id_fkey"
		}).onDelete("cascade"),
]);

export const userCredits = pgTable("user_credits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	creditType: text("credit_type").notNull(),
	amount: integer().default(0).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_credits_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_user_credits_type").using("btree", table.creditType.asc().nullsLast().op("text_ops")),
	index("idx_user_credits_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_credits_user_id_fkey"
		}).onDelete("cascade"),
]);

export const userCalculatorPreferences = pgTable("user_calculator_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	buildingRatio: numeric("building_ratio", { precision: 4, scale:  3 }),
	maintenanceCostPerSqm: numeric("maintenance_cost_per_sqm", { precision: 6, scale:  2 }),
	nonAllocableHausgeldRatio: numeric("non_allocable_hausgeld_ratio", { precision: 4, scale:  3 }),
	costIncreaseRate: numeric("cost_increase_rate", { precision: 4, scale:  3 }),
	rentIncreaseRate: numeric("rent_increase_rate", { precision: 4, scale:  3 }),
	valueAppreciationRate: numeric("value_appreciation_rate", { precision: 4, scale:  3 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_calculator_preferences_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_calculator_preferences_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_calculator_preferences_user_id_unique").on(table.userId),
	check("chk_user_building_ratio", sql`(building_ratio IS NULL) OR ((building_ratio > (0)::numeric) AND (building_ratio <= (1)::numeric))`),
	check("chk_user_cost_increase", sql`(cost_increase_rate IS NULL) OR ((cost_increase_rate >= (0)::numeric) AND (cost_increase_rate <= 0.5))`),
	check("chk_user_maintenance_cost", sql`(maintenance_cost_per_sqm IS NULL) OR (maintenance_cost_per_sqm >= (0)::numeric)`),
	check("chk_user_non_allocable_ratio", sql`(non_allocable_hausgeld_ratio IS NULL) OR ((non_allocable_hausgeld_ratio >= (0)::numeric) AND (non_allocable_hausgeld_ratio <= (1)::numeric))`),
	check("chk_user_rent_increase", sql`(rent_increase_rate IS NULL) OR ((rent_increase_rate >= (0)::numeric) AND (rent_increase_rate <= 0.5))`),
	check("chk_user_value_appreciation", sql`(value_appreciation_rate IS NULL) OR ((value_appreciation_rate >= '-0.2'::numeric) AND (value_appreciation_rate <= 0.5))`),
]);

export const plzMarketData = pgTable("plz_market_data", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	plz: varchar({ length: 5 }).notNull(),
	city: varchar({ length: 255 }).notNull(),
	district: varchar({ length: 255 }),
	federalState: varchar("federal_state", { length: 100 }),
	avgPurchasePriceSqm: numeric("avg_purchase_price_sqm", { precision: 10, scale:  2 }),
	purchasePriceMin: numeric("purchase_price_min", { precision: 10, scale:  2 }),
	purchasePriceMax: numeric("purchase_price_max", { precision: 10, scale:  2 }),
	avgRentSqm: numeric("avg_rent_sqm", { precision: 8, scale:  2 }),
	rentMin: numeric("rent_min", { precision: 8, scale:  2 }),
	rentMax: numeric("rent_max", { precision: 8, scale:  2 }),
	population: integer(),
	dataSource: varchar("data_source", { length: 100 }).default('ai_estimated'),
	confidenceScore: numeric("confidence_score", { precision: 3, scale:  2 }).default('0.85'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	stadtteil: varchar({ length: 255 }),
	grunderwerbsteuerRate: numeric("grunderwerbsteuer_rate", { precision: 4, scale:  2 }),
}, (table) => [
	index("idx_plz_market_city").using("btree", table.city.asc().nullsLast().op("text_ops")),
	index("idx_plz_market_plz").using("btree", table.plz.asc().nullsLast().op("text_ops")),
	index("idx_plz_market_stadtteil").using("btree", table.stadtteil.asc().nullsLast().op("text_ops")),
	index("idx_plz_market_state").using("btree", table.federalState.asc().nullsLast().op("text_ops")),
	index("idx_plz_market_tax_rate").using("btree", table.grunderwerbsteuerRate.asc().nullsLast().op("numeric_ops")),
	unique("plz_market_data_plz_key").on(table.plz),
]);

export const propertyProviderContacts = pgTable("property_provider_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	propertyId: uuid("property_id").notNull(),
	providerName: text("provider_name"),
	providerEmail: text("provider_email"),
	providerPhone: text("provider_phone"),
	providerCompany: text("provider_company"),
	createdByUserId: uuid("created_by_user_id"),
	invitedAt: timestamp("invited_at", { mode: 'string' }),
	invitationAcceptedAt: timestamp("invitation_accepted_at", { mode: 'string' }),
	linkedUserId: uuid("linked_user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_provider_contacts_email").using("btree", table.providerEmail.asc().nullsLast().op("text_ops")),
	index("idx_provider_contacts_linked_user").using("btree", table.linkedUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_provider_contacts_property").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "property_provider_contacts_created_by_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.linkedUserId],
			foreignColumns: [users.id],
			name: "property_provider_contacts_linked_user_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "property_provider_contacts_property_id_fkey"
		}).onDelete("cascade"),
	unique("unique_provider_per_property").on(table.propertyId),
	check("valid_email", sql`provider_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text`),
]);

export const calculatorDefaults = pgTable("calculator_defaults", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	buildingRatioStandard: numeric("building_ratio_standard", { precision: 4, scale:  3 }).default('0.80').notNull(),
	buildingRatioNeubau: numeric("building_ratio_neubau", { precision: 4, scale:  3 }).default('0.85').notNull(),
	maintenanceCostPerSqm: numeric("maintenance_cost_per_sqm", { precision: 6, scale:  2 }).default('10.00').notNull(),
	nonAllocableHausgeldRatio: numeric("non_allocable_hausgeld_ratio", { precision: 4, scale:  3 }).default('0.30').notNull(),
	costIncreaseRate: numeric("cost_increase_rate", { precision: 4, scale:  3 }).default('0.02').notNull(),
	rentIncreaseRate: numeric("rent_increase_rate", { precision: 4, scale:  3 }).default('0.03').notNull(),
	valueAppreciationRate: numeric("value_appreciation_rate", { precision: 4, scale:  3 }).default('0.02').notNull(),
	hausgeldPerSqmModern: numeric("hausgeld_per_sqm_modern", { precision: 5, scale:  2 }).default('2.50').notNull(),
	hausgeldPerSqmOld: numeric("hausgeld_per_sqm_old", { precision: 5, scale:  2 }).default('3.50').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	changedBy: text("changed_by"),
	changeReason: text("change_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	equityPercentage: numeric("equity_percentage", { precision: 5, scale:  2 }).default('20.00').notNull(),
	amortizationRate: numeric("amortization_rate", { precision: 4, scale:  2 }).default('1.00').notNull(),
}, (table) => [
	index("idx_calculator_defaults_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")).where(sql`(is_active = true)`),
	check("chk_amortization_rate", sql`(amortization_rate >= (0)::numeric) AND (amortization_rate <= (10)::numeric)`),
	check("chk_building_ratio_neubau", sql`(building_ratio_neubau > (0)::numeric) AND (building_ratio_neubau <= (1)::numeric)`),
	check("chk_building_ratio_standard", sql`(building_ratio_standard > (0)::numeric) AND (building_ratio_standard <= (1)::numeric)`),
	check("chk_cost_increase", sql`(cost_increase_rate >= (0)::numeric) AND (cost_increase_rate <= 0.5)`),
	check("chk_equity_percentage", sql`(equity_percentage >= (0)::numeric) AND (equity_percentage <= (100)::numeric)`),
	check("chk_hausgeld_modern", sql`hausgeld_per_sqm_modern >= (0)::numeric`),
	check("chk_hausgeld_old", sql`hausgeld_per_sqm_old >= (0)::numeric`),
	check("chk_maintenance_cost", sql`maintenance_cost_per_sqm >= (0)::numeric`),
	check("chk_non_allocable_ratio", sql`(non_allocable_hausgeld_ratio >= (0)::numeric) AND (non_allocable_hausgeld_ratio <= (1)::numeric)`),
	check("chk_rent_increase", sql`(rent_increase_rate >= (0)::numeric) AND (rent_increase_rate <= 0.5)`),
	check("chk_value_appreciation", sql`(value_appreciation_rate >= '-0.2'::numeric) AND (value_appreciation_rate <= 0.5)`),
]);

export const userPropertyParameters = pgTable("user_property_parameters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	propertyId: uuid("property_id").notNull(),
	equityPercentage: numeric("equity_percentage", { precision: 5, scale:  2 }),
	interestRate: numeric("interest_rate", { precision: 5, scale:  2 }),
	amortizationRate: numeric("amortization_rate", { precision: 5, scale:  2 }),
	brokerCommission: numeric("broker_commission", { precision: 5, scale:  2 }),
	monthlyRent: numeric("monthly_rent", { precision: 10, scale:  2 }),
	monthlyFee: numeric("monthly_fee", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	purchasePrice: numeric("purchase_price", { precision: 12, scale:  2 }),
	calculatedGrossYield: numeric("calculated_gross_yield", { precision: 5, scale:  2 }),
	calculatedRentMultiplier: numeric("calculated_rent_multiplier", { precision: 5, scale:  1 }),
	calculatedMonthlyCashflow: numeric("calculated_monthly_cashflow", { precision: 10, scale:  2 }),
	renovationCosts: numeric("renovation_costs", { precision: 10, scale:  2 }),
	investorFazitText: text("investor_fazit_text"),
	investorFazitTips: jsonb("investor_fazit_tips"),
	investorFazitVerdict: text("investor_fazit_verdict"),
	eigennutzerFazitText: text("eigennutzer_fazit_text"),
	eigennutzerFazitTips: jsonb("eigennutzer_fazit_tips"),
	eigennutzerFazitVerdict: text("eigennutzer_fazit_verdict"),
	fazitGeneratedAt: timestamp("fazit_generated_at", { withTimezone: true, mode: 'string' }),
	investorNegotiationOpenai: text("investor_negotiation_openai"),
	investorNegotiationClaude: text("investor_negotiation_claude"),
	investorTargetPriceOpenai: numeric("investor_target_price_openai", { precision: 12, scale:  2 }),
	investorTargetPriceClaude: numeric("investor_target_price_claude", { precision: 12, scale:  2 }),
	investorAdviceGeneratedAt: timestamp("investor_advice_generated_at", { mode: 'string' }),
	investorAdviceInputsHash: varchar("investor_advice_inputs_hash", { length: 64 }),
	eigennutzerAdviceOpenai: text("eigennutzer_advice_openai"),
	eigennutzerAdviceClaude: text("eigennutzer_advice_claude"),
	eigennutzerRecommendationOpenai: varchar("eigennutzer_recommendation_openai", { length: 50 }),
	eigennutzerRecommendationClaude: varchar("eigennutzer_recommendation_claude", { length: 50 }),
	eigennutzerAdviceGeneratedAt: timestamp("eigennutzer_advice_generated_at", { mode: 'string' }),
	eigennutzerAdviceInputsHash: varchar("eigennutzer_advice_inputs_hash", { length: 64 }),
}, (table) => [
	index("idx_eigennutzer_advice_hash").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.propertyId.asc().nullsLast().op("text_ops"), table.eigennutzerAdviceInputsHash.asc().nullsLast().op("text_ops")),
	index("idx_investor_advice_hash").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.propertyId.asc().nullsLast().op("uuid_ops"), table.investorAdviceInputsHash.asc().nullsLast().op("uuid_ops")),
	index("idx_user_property_params_property").using("btree", table.propertyId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_property_params_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "user_property_parameters_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_property_parameters_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_property_parameters_user_id_property_id_key").on(table.userId, table.propertyId),
]);

export const properties = pgTable("properties", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	agentId: uuid("agent_id"),
	title: text().notNull(),
	description: text(),
	location: text().notNull(),
	price: integer().notNull(),
	monthlyRent: integer("monthly_rent"),
	sqm: numeric({ precision: 10, scale:  2 }).notNull(),
	rooms: numeric({ precision: 4, scale:  1 }).notNull(),
	features: text().array().default([""]),
	images: text().array().default([""]),
	highlights: text().array().default([""]),
	redFlags: text("red_flags").array().default([""]),
	aiScore: integer("ai_score"),
	yield: numeric({ precision: 4, scale:  2 }),
	energyClass: text("energy_class"),
	availableFrom: text("available_from"),
	status: text().default('active'),
	views: integer().default(0),
	favoritesCount: integer("favorites_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	userId: uuid("user_id"),
	propertyType: text("property_type"),
	postalCode: text("postal_code"),
	streetAddress: text("street_address"),
	totalFloors: integer("total_floors"),
	floorLevel: text("floor_level"),
	usableArea: numeric("usable_area", { precision: 10, scale:  2 }),
	usableAreaRatio: text("usable_area_ratio"),
	bathrooms: integer(),
	condition: text(),
	monthlyFee: numeric("monthly_fee", { precision: 10, scale:  2 }),
	commissionRate: numeric("commission_rate", { precision: 5, scale:  2 }),
	requireAddressConsent: boolean("require_address_consent").default(false),
	yearBuilt: integer("year_built"),
	heatingType: text("heating_type"),
	energySource: text("energy_source"),
	energyCertificate: text("energy_certificate"),
	aiInvestmentScore: integer("ai_investment_score"),
	scoreColor: text("score_color"),
	scoreBreakdown: jsonb("score_breakdown"),
	scoreCalculatedAt: timestamp("score_calculated_at", { mode: 'string' }),
	aiDetailedEvaluation: jsonb("ai_detailed_evaluation"),
	buyerEvaluation: jsonb("buyer_evaluation"),
	sellerAnalysis: jsonb("seller_analysis"),
	exposeText: text("expose_text"),
	energyEfficiencyClass: text("energy_efficiency_class"),
	importantNotes: text("important_notes"),
	actualMonthlyRent: integer("actual_monthly_rent"),
	sellerEvaluation: jsonb("seller_evaluation"),
	videoUrl: text("video_url"),
	isExternal: boolean("is_external").default(false),
	isCommunityShared: boolean("is_community_shared").default(false),
	externalUrl: text("external_url"),
	externalSource: text("external_source"),
	documents: jsonb().default([]),
	fullAccessToken: varchar("full_access_token", { length: 32 }),
	documentReleaseMode: varchar("document_release_mode", { length: 20 }).default('automatic'),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	soldPrice: integer("sold_price"),
	soldAt: timestamp("sold_at", { withTimezone: true, mode: 'string' }),
	afaType: text("afa_type").default('bestand'),
	sellerNotes: text("seller_notes").default(''),
	afaRate: numeric("afa_rate", { precision: 5, scale:  4 }),
	buildingRatio: numeric("building_ratio", { precision: 5, scale:  4 }),
	conversationsCount: integer("conversations_count").default(0),
	sharesCount: integer("shares_count").default(0),
	dismissedCount: integer("dismissed_count").default(0),
}, (table) => [
	index("idx_properties_ai_investment_score").using("btree", table.aiInvestmentScore.desc().nullsFirst().op("int4_ops")),
	index("idx_properties_documents").using("gin", table.documents.asc().nullsLast().op("jsonb_ops")),
	index("idx_properties_full_access_token").using("btree", table.fullAccessToken.asc().nullsLast().op("text_ops")).where(sql`(full_access_token IS NOT NULL)`),
	index("idx_properties_location_status").using("btree", table.location.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`(status = 'active'::text)`),
	index("idx_properties_price_status").using("btree", table.price.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")).where(sql`(status = 'active'::text)`),
	index("idx_properties_recommendations").using("btree", table.location.asc().nullsLast().op("int4_ops"), table.price.asc().nullsLast().op("text_ops"), table.rooms.asc().nullsLast().op("numeric_ops"), table.propertyType.asc().nullsLast().op("text_ops")).where(sql`(status = 'active'::text)`),
	index("idx_properties_score_color").using("btree", table.scoreColor.asc().nullsLast().op("text_ops")),
	index("idx_properties_seller_evaluation").using("gin", table.sellerEvaluation.asc().nullsLast().op("jsonb_ops")),
	index("idx_properties_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_properties_user_id_status").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("properties_agent_id_idx").using("btree", table.agentId.asc().nullsLast().op("uuid_ops")),
	index("properties_ai_score_idx").using("btree", table.aiScore.desc().nullsFirst().op("int4_ops")),
	index("properties_condition_idx").using("btree", table.condition.asc().nullsLast().op("text_ops")),
	index("properties_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("properties_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	index("properties_location_idx").using("btree", table.location.asc().nullsLast().op("text_ops")),
	index("properties_market_comparison_idx").using("btree", table.location.asc().nullsLast().op("timestamptz_ops"), table.soldAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`((status = 'sold'::text) AND (deleted_at IS NULL) AND (sold_price IS NOT NULL))`),
	index("properties_postal_code_idx").using("btree", table.postalCode.asc().nullsLast().op("text_ops")),
	index("properties_price_idx").using("btree", table.price.asc().nullsLast().op("int4_ops")),
	index("properties_property_type_idx").using("btree", table.propertyType.asc().nullsLast().op("text_ops")),
	index("properties_sold_price_idx").using("btree", table.soldPrice.asc().nullsLast().op("int4_ops")).where(sql`(sold_price IS NOT NULL)`),
	index("properties_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("properties_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("properties_year_built_idx").using("btree", table.yearBuilt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "properties_user_id_fkey"
		}),
	unique("properties_full_access_token_key").on(table.fullAccessToken),
	pgPolicy("Anyone can view active properties", { as: "permissive", for: "select", to: ["public"], using: sql`(status = 'active'::text)` }),
	check("properties_actual_monthly_rent_check", sql`actual_monthly_rent >= 0`),
	check("properties_afa_type_check", sql`afa_type = ANY (ARRAY['bestand'::text, 'altbau'::text, 'neubau'::text, 'denkmal'::text])`),
	check("properties_ai_investment_score_check", sql`(ai_investment_score >= 0) AND (ai_investment_score <= 100)`),
	check("properties_ai_score_check", sql`(ai_score >= 0) AND (ai_score <= 100)`),
	check("properties_bathrooms_check", sql`bathrooms >= 0`),
	check("properties_commission_rate_check", sql`(commission_rate >= (0)::numeric) AND (commission_rate <= (100)::numeric)`),
	check("properties_condition_check", sql`condition = ANY (ARRAY['new'::text, 'first_occupancy'::text, 'renovated'::text, 'maintained'::text, 'needs_renovation'::text])`),
	check("properties_conversations_count_check", sql`conversations_count >= 0`),
	check("properties_dismissed_count_check", sql`dismissed_count >= 0`),
	check("properties_document_release_mode_check", sql`(document_release_mode)::text = ANY ((ARRAY['automatic'::character varying, 'manual'::character varying])::text[])`),
	check("properties_energy_certificate_check", sql`energy_certificate = ANY (ARRAY['demand'::text, 'consumption'::text, 'none'::text])`),
	check("properties_energy_source_check", sql`energy_source = ANY (ARRAY['gas'::text, 'oil'::text, 'electricity'::text, 'district_heating'::text, 'solar'::text, 'geothermal'::text, 'biomass'::text, 'other'::text])`),
	check("properties_heating_type_check", sql`heating_type = ANY (ARRAY['central'::text, 'floor'::text, 'gas'::text, 'oil'::text, 'district'::text, 'electric'::text, 'solar'::text, 'heat_pump'::text, 'other'::text])`),
	check("properties_monthly_fee_check", sql`(monthly_fee IS NULL) OR (monthly_fee >= (0)::numeric)`),
	check("properties_monthly_rent_check", sql`monthly_rent >= 0`),
	check("properties_price_check", sql`price > 0`),
	check("properties_property_type_check", sql`property_type = ANY (ARRAY['apartment'::text, 'house'::text, 'villa'::text, 'multi_family'::text, 'land'::text, 'commercial'::text, 'office'::text, 'retail'::text, 'industrial'::text, 'parking'::text])`),
	check("properties_rooms_check", sql`(rooms IS NULL) OR (rooms >= (0)::numeric)`),
	check("properties_score_color_check", sql`score_color = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text])`),
	check("properties_shares_count_check", sql`shares_count >= 0`),
	check("properties_sold_price_check", sql`sold_price > 0`),
	check("properties_sqm_check", sql`(sqm IS NULL) OR (sqm >= (0)::numeric)`),
	check("properties_status_check", sql`status = ANY (ARRAY['active'::text, 'pending'::text, 'archived'::text, 'sold'::text, 'inactive'::text])`),
	check("properties_total_floors_check", sql`total_floors > 0`),
	check("properties_usable_area_check", sql`(usable_area IS NULL) OR (usable_area >= (0)::numeric)`),
	check("properties_year_built_check", sql`(year_built >= 1800) AND ((year_built)::numeric <= (EXTRACT(year FROM now()) + (5)::numeric))`),
	check("properties_yield_check", sql`yield >= (0)::numeric`),
]);

export const propertySimilarities = pgTable("property_similarities", {
	propertyAId: uuid("property_a_id").notNull(),
	propertyBId: uuid("property_b_id").notNull(),
	similarityScore: numeric("similarity_score", { precision: 3, scale:  2 }).notNull(),
	commonUsers: integer("common_users").default(0).notNull(),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_similarities_score").using("btree", table.similarityScore.desc().nullsFirst().op("numeric_ops")),
	foreignKey({
			columns: [table.propertyAId],
			foreignColumns: [properties.id],
			name: "property_similarities_property_a_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.propertyBId],
			foreignColumns: [properties.id],
			name: "property_similarities_property_b_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.propertyAId, table.propertyBId], name: "property_similarities_pkey"}),
	check("property_similarities_check", sql`property_a_id < property_b_id`),
	check("property_similarities_similarity_score_check", sql`(similarity_score >= (0)::numeric) AND (similarity_score <= (1)::numeric)`),
]);

export const recommendationsCache = pgTable("recommendations_cache", {
	userId: uuid("user_id").notNull(),
	propertyId: uuid("property_id").notNull(),
	finalScore: numeric("final_score", { precision: 5, scale:  2 }).notNull(),
	contentScore: numeric("content_score", { precision: 5, scale:  2 }),
	collaborativeScore: numeric("collaborative_score", { precision: 5, scale:  2 }),
	popularityScore: numeric("popularity_score", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_recommendations_cache_user_score").using("btree", table.userId.asc().nullsLast().op("numeric_ops"), table.finalScore.desc().nullsFirst().op("numeric_ops")),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.id],
			name: "recommendations_cache_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "recommendations_cache_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.propertyId], name: "recommendations_cache_pkey"}),
]);
