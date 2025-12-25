/**
 * Payments Router
 * Handles Stripe subscription and payment management
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import {
  stripe,
  isStripeConfigured,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
} from '../lib/stripe.js';
import {
  STRIPE_PRICES,
  PlanType,
  getStripePriceId,
  isSubscriptionPlan,
  hasFeatureAccess,
} from '../config/stripe-prices.js';

// Cache for Stripe prices (refresh every 5 minutes)
let stripePricesCache: {
  data: Record<string, { priceEur: number; interval: string }> | null;
  timestamp: number;
} = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch prices from Stripe API
 */
async function fetchStripePrices(): Promise<Record<string, { priceEur: number; interval: string }>> {
  // Check cache
  if (stripePricesCache.data && Date.now() - stripePricesCache.timestamp < CACHE_TTL) {
    return stripePricesCache.data;
  }

  if (!isStripeConfigured()) {
    console.log('[Payments] Stripe not configured, using fallback prices');
    return {};
  }

  const prices: Record<string, { priceEur: number; interval: string }> = {};

  try {
    // Fetch all prices from Stripe in one call
    const priceIds = Object.values(STRIPE_PRICES).map(p => p.stripePriceId);
    const stripePriceList = await stripe.prices.list({
      active: true,
      limit: 100,
    });

    // Map Stripe prices to our plan types
    for (const [planType, config] of Object.entries(STRIPE_PRICES)) {
      const stripePrice = stripePriceList.data.find(p => p.id === config.stripePriceId);

      if (stripePrice) {
        prices[planType] = {
          priceEur: (stripePrice.unit_amount || 0) / 100,
          interval: stripePrice.recurring?.interval || 'one_time',
        };
      } else {
        // Fallback to config if price not found in Stripe
        prices[planType] = {
          priceEur: config.priceEur,
          interval: config.interval,
        };
      }
    }

    // Update cache
    stripePricesCache = { data: prices, timestamp: Date.now() };
    console.log('[Payments] Fetched prices from Stripe:', Object.keys(prices).length, 'plans');

    return prices;
  } catch (error) {
    console.error('[Payments] Failed to fetch Stripe prices:', error);
    // Return fallback prices from config
    const fallback: Record<string, { priceEur: number; interval: string }> = {};
    for (const [planType, config] of Object.entries(STRIPE_PRICES)) {
      fallback[planType] = {
        priceEur: config.priceEur,
        interval: config.interval,
      };
    }
    return fallback;
  }
}

export const paymentsRouter = router({
  /**
   * Get current user's subscription status
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await queryOne(
      `SELECT
        id,
        plan_type,
        status,
        stripe_subscription_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at
      FROM subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [ctx.user.id]
    );

    if (!subscription) {
      return {
        plan: 'free' as PlanType,
        status: 'active',
        isSubscribed: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      };
    }

    return {
      plan: subscription.plan_type as PlanType,
      status: subscription.status,
      isSubscribed: subscription.status === 'active' || subscription.status === 'trialing',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end,
      stripeSubscriptionId: subscription.stripe_subscription_id,
    };
  }),

  /**
   * Create a Stripe Checkout Session for subscription
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planType: z.enum([
          'investor',
          'pro',
          'sucher',
          'makler_pro',
          'makler_enterprise',
          'verkauf_starter',
          'verkauf_premium',
        ]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Payment system is not configured',
        });
      }

      const priceId = getStripePriceId(input.planType);
      if (!priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid plan type',
        });
      }

      // Get user email
      const user = await queryOne('SELECT email FROM users WHERE id = $1', [ctx.user.id]);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Get user profile for name
      const profile = await queryOne(
        'SELECT first_name, last_name FROM user_profiles WHERE user_id = $1',
        [ctx.user.id]
      );
      const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : undefined;

      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer(ctx.user.id, user.email, fullName);

      // Determine mode based on plan type
      const mode = isSubscriptionPlan(input.planType) ? 'subscription' : 'payment';

      // Create checkout session
      const session = await createCheckoutSession({
        customerId,
        priceId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        userId: ctx.user.id,
        mode,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  /**
   * Create a Customer Portal session for subscription management
   */
  createPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Payment system is not configured',
        });
      }

      // Get user's Stripe customer ID
      const subscription = await queryOne(
        'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
        [ctx.user.id]
      );

      if (!subscription?.stripe_customer_id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No subscription found',
        });
      }

      const session = await createPortalSession(subscription.stripe_customer_id, input.returnUrl);

      return {
        url: session.url,
      };
    }),

  /**
   * Check if user has access to a specific feature
   */
  checkFeatureAccess: protectedProcedure
    .input(
      z.object({
        feature: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get user's current plan
      const subscription = await queryOne(
        `SELECT plan_type FROM subscriptions
         WHERE user_id = $1 AND status IN ('active', 'trialing')
         ORDER BY created_at DESC
         LIMIT 1`,
        [ctx.user.id]
      );

      const planType: PlanType = subscription?.plan_type || 'free';
      const hasAccess = hasFeatureAccess(planType, input.feature);

      return {
        hasAccess,
        currentPlan: planType,
        requiredPlans: hasAccess ? null : STRIPE_PRICES,
      };
    }),

  /**
   * Get available plans with pricing (fetches from Stripe)
   * Public endpoint - no auth required for pricing page
   */
  getPlans: publicProcedure.query(async () => {
    // Fetch prices from Stripe (with caching)
    const stripePrices = await fetchStripePrices();

    return Object.entries(STRIPE_PRICES).map(([key, config]) => {
      const stripeData = stripePrices[key];
      return {
        id: key,
        name: config.name,
        // Use Stripe price if available, otherwise fallback to config
        price: stripeData?.priceEur ?? config.priceEur,
        interval: stripeData?.interval ?? config.interval,
        features: config.features,
      };
    });
  }),

  /**
   * Cancel subscription at period end
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await queryOne(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1',
      [ctx.user.id]
    );

    if (!subscription?.stripe_subscription_id) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription found',
      });
    }

    // Cancel at period end via Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update our database
    await query(
      `UPDATE subscriptions
       SET cancel_at_period_end = true, updated_at = NOW()
       WHERE user_id = $1`,
      [ctx.user.id]
    );

    return { success: true, message: 'Subscription will be canceled at period end' };
  }),

  /**
   * Reactivate a canceled subscription
   */
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await queryOne(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND cancel_at_period_end = true',
      [ctx.user.id]
    );

    if (!subscription?.stripe_subscription_id) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No canceled subscription found to reactivate',
      });
    }

    // Reactivate via Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Update our database
    await query(
      `UPDATE subscriptions
       SET cancel_at_period_end = false, updated_at = NOW()
       WHERE user_id = $1`,
      [ctx.user.id]
    );

    return { success: true, message: 'Subscription reactivated' };
  }),
});
