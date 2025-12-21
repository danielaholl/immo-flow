/**
 * Stripe Webhook Handler
 * Processes Stripe events for subscription management
 */
import { Request, Response, Router, type IRouter } from 'express';
import Stripe from 'stripe';
import { stripe, verifyWebhookSignature } from '../lib/stripe.js';
import { query, queryOne } from '../db.js';
import { getPlanTypeFromPriceId } from '../config/stripe-prices.js';

const router = Router();

/**
 * Log payment event for audit trail
 */
async function logPaymentEvent(
  userId: string | null,
  eventId: string,
  eventType: string,
  payload: unknown
): Promise<void> {
  await query(
    `INSERT INTO payment_events (user_id, stripe_event_id, event_type, payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [userId, eventId, eventType, JSON.stringify(payload)]
  );
}

/**
 * Handle checkout.session.completed
 * User completed Stripe Checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  if (session.mode === 'subscription') {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem?.price.id;
    const planType = getPlanTypeFromPriceId(priceId) || 'free';

    // Get billing period from subscription item (new Stripe API structure)
    const periodStart = subscriptionItem?.current_period_start;
    const periodEnd = subscriptionItem?.current_period_end;

    // Upsert subscription record
    await query(
      `INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
        plan_type, status, current_period_start, current_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), to_timestamp($8))
      ON CONFLICT (user_id)
      DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        stripe_price_id = EXCLUDED.stripe_price_id,
        plan_type = EXCLUDED.plan_type,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = false,
        updated_at = NOW()`,
      [
        userId,
        customerId,
        subscription.id,
        priceId,
        planType,
        subscription.status,
        periodStart,
        periodEnd,
      ]
    );

    console.log(`Subscription created for user ${userId}: ${planType}`);
  } else if (session.mode === 'payment') {
    // One-time payment (Verkäufer plans)
    const paymentIntent = session.payment_intent as string;

    await query(
      `INSERT INTO one_time_payments (
        user_id, stripe_payment_intent_id, stripe_customer_id,
        product_type, amount_cents, status, paid_at
      ) VALUES ($1, $2, $3, $4, $5, 'succeeded', NOW())`,
      [userId, paymentIntent, customerId, session.metadata?.productType || 'unknown', session.amount_total]
    );

    console.log(`One-time payment completed for user ${userId}`);
  }
}

/**
 * Handle customer.subscription.updated
 * Subscription was modified (upgrade, downgrade, renewal)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;
  const planType = getPlanTypeFromPriceId(priceId) || 'free';

  // Get billing period from subscription item (new Stripe API structure)
  const periodStart = subscriptionItem?.current_period_start;
  const periodEnd = subscriptionItem?.current_period_end;

  await query(
    `UPDATE subscriptions SET
      stripe_price_id = $1,
      plan_type = $2,
      status = $3,
      current_period_start = to_timestamp($4),
      current_period_end = to_timestamp($5),
      cancel_at_period_end = $6,
      updated_at = NOW()
     WHERE stripe_customer_id = $7`,
    [
      priceId,
      planType,
      subscription.status,
      periodStart,
      periodEnd,
      subscription.cancel_at_period_end,
      customerId,
    ]
  );

  console.log(`Subscription updated for customer ${customerId}: ${planType}, status: ${subscription.status}`);
}

/**
 * Handle customer.subscription.deleted
 * Subscription was canceled/ended
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  await query(
    `UPDATE subscriptions SET
      plan_type = 'free',
      status = 'canceled',
      updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [customerId]
  );

  console.log(`Subscription deleted for customer ${customerId}, reverted to free`);
}

/**
 * Handle invoice.payment_failed
 * Payment failed - notify user
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  await query(
    `UPDATE subscriptions SET
      status = 'past_due',
      updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [customerId]
  );

  // TODO: Send email notification to user
  console.log(`Payment failed for customer ${customerId}`);
}

/**
 * Handle invoice.paid
 * Payment succeeded
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // Ensure status is active after successful payment
  await query(
    `UPDATE subscriptions SET
      status = 'active',
      updated_at = NOW()
     WHERE stripe_customer_id = $1 AND status = 'past_due'`,
    [customerId]
  );

  console.log(`Invoice paid for customer ${customerId}`);
}

/**
 * Main webhook endpoint
 */
router.post(
  '/stripe',
  // Use raw body for signature verification
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('No stripe-signature header');
      return res.status(400).send('Missing signature');
    }

    let event: Stripe.Event;

    try {
      event = verifyWebhookSignature(req.body, sig as string);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    // Get user ID for logging (if available)
    let userId: string | null = null;
    if ('metadata' in event.data.object) {
      userId = (event.data.object as { metadata?: { userId?: string } }).metadata?.userId || null;
    }

    // Log event for audit
    await logPaymentEvent(userId, event.id, event.type, event.data.object);

    // Handle specific events
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling ${event.type}:`, error);
      // Still return 200 to acknowledge receipt
      // Stripe will retry on 4xx/5xx
    }

    // Return 200 to acknowledge receipt
    res.json({ received: true });
  }
);

export const stripeWebhookRouter: IRouter = router;
