/**
 * Payments Router
 * Handles Stripe subscription and payment management
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
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
   * Get available plans with pricing
   */
  getPlans: protectedProcedure.query(async () => {
    return Object.entries(STRIPE_PRICES).map(([key, config]) => ({
      id: key,
      name: config.name,
      price: config.priceEur,
      interval: config.interval,
      features: config.features,
    }));
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
