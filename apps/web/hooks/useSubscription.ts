/**
 * useSubscription Hook
 * Provides subscription state and actions for the current user
 */
import { trpc } from '../lib/trpc';

export type PlanType =
  | 'free'
  | 'investor'
  | 'pro'
  | 'sucher'
  | 'makler_pro'
  | 'makler_enterprise'
  | 'verkauf_starter'
  | 'verkauf_premium';

export interface Subscription {
  plan: PlanType;
  status: string;
  isSubscribed: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  stripeSubscriptionId?: string;
}

export function useSubscription() {
  const { data, isLoading, error, refetch } = trpc.payments.getSubscription.useQuery(
    undefined,
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    }
  );

  const createCheckoutMutation = trpc.payments.createCheckoutSession.useMutation();
  const createPortalMutation = trpc.payments.createPortalSession.useMutation();
  const cancelMutation = trpc.payments.cancelSubscription.useMutation();
  const reactivateMutation = trpc.payments.reactivateSubscription.useMutation();

  const subscription: Subscription | null = data
    ? {
        plan: (data.plan as PlanType) || 'free',
        status: data.status || 'active',
        isSubscribed: data.isSubscribed || false,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
        currentPeriodEnd: data.currentPeriodEnd || null,
        stripeSubscriptionId: (data as any).stripeSubscriptionId,
      }
    : null;

  const plan = subscription?.plan || 'free';
  const isActive = subscription?.isSubscribed ?? false;
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled' || subscription?.cancelAtPeriodEnd;

  /**
   * Start checkout flow for a plan
   */
  const checkout = async (planType: Exclude<PlanType, 'free'>): Promise<string | null> => {
    try {
      const baseUrl = window.location.origin;
      const result = await createCheckoutMutation.mutateAsync({
        planType,
        successUrl: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/pricing/cancel`,
      });
      if (result.url) {
        window.location.href = result.url;
        return result.url;
      }
      return null;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      throw err;
    }
  };

  /**
   * Open Stripe Customer Portal for subscription management
   */
  const manageSubscription = async (): Promise<void> => {
    try {
      const baseUrl = window.location.origin;
      const result = await createPortalMutation.mutateAsync({
        returnUrl: `${baseUrl}/settings`,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Failed to create portal session:', err);
      throw err;
    }
  };

  /**
   * Cancel subscription at period end
   */
  const cancel = async (): Promise<void> => {
    try {
      await cancelMutation.mutateAsync();
      await refetch();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      throw err;
    }
  };

  /**
   * Reactivate a canceled subscription
   */
  const reactivate = async (): Promise<void> => {
    try {
      await reactivateMutation.mutateAsync();
      await refetch();
    } catch (err) {
      console.error('Failed to reactivate subscription:', err);
      throw err;
    }
  };

  /**
   * Check if user can access a feature based on their plan
   */
  const canAccess = (feature: string): boolean => {
    const featureAccess: Record<string, PlanType[]> = {
      unlimited_favorites: ['investor', 'pro', 'sucher', 'makler_pro', 'makler_enterprise'],
      ai_analysis: ['investor', 'pro'],
      swot_analysis: ['investor', 'pro'],
      rendite_calculator: ['investor', 'pro'],
      financing_calculator: ['investor', 'pro'],
      cashflow_projection: ['investor', 'pro'],
      portfolio_overview: ['pro'],
      pdf_export: ['pro'],
      investor_club: ['pro'],
      priority_support: ['pro', 'makler_enterprise'],
      budget_search: ['sucher', 'investor', 'pro'],
      price_check: ['sucher', 'investor', 'pro'],
      makler_features: ['makler_pro', 'makler_enterprise'],
      unlimited_properties: ['makler_enterprise'],
      team_seats: ['makler_enterprise'],
    };

    if (!featureAccess[feature]) return true;
    return featureAccess[feature].includes(plan);
  };

  /**
   * Check if current plan is higher than another plan
   */
  const isPlanHigherThan = (otherPlan: PlanType): boolean => {
    const hierarchy: Record<PlanType, number> = {
      free: 0,
      sucher: 1,
      investor: 2,
      pro: 3,
      makler_pro: 10,
      makler_enterprise: 11,
      verkauf_starter: 20,
      verkauf_premium: 21,
    };
    return hierarchy[plan] > hierarchy[otherPlan];
  };

  return {
    // State
    subscription,
    plan,
    isLoading,
    error,
    isActive,
    isPastDue,
    isCanceled,

    // Actions
    checkout,
    manageSubscription,
    cancel,
    reactivate,
    refetch,

    // Helpers
    canAccess,
    isPlanHigherThan,

    // Mutation states
    isCheckoutLoading: createCheckoutMutation.isPending,
    isPortalLoading: createPortalMutation.isPending,
    isCancelLoading: cancelMutation.isPending,
    isReactivateLoading: reactivateMutation.isPending,
  };
}
