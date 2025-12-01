/**
 * Investment Scoring API
 * AI-powered property evaluation from investor perspective
 */
import { supabase } from '@immoflow/database';
import type { Database } from '@immoflow/database';

// =====================================================
// TYPES
// =====================================================

export type PropertyAIEvaluation = Database['public']['Tables']['property_ai_evaluations']['Row'];
export type PropertyAIEvaluationInsert = Database['public']['Tables']['property_ai_evaluations']['Insert'];

export interface EvaluationResponse {
  success: boolean;
  evaluation: PropertyAIEvaluation;
  property_id: string;
  overall_score: number;
  color_rating: 'green' | 'yellow' | 'red';
  breakdown: {
    location_score: number;
    price_score: number;
    yield_score: number;
    appreciation_score: number;
    features_score: number;
  };
  metrics: {
    price_per_sqm: number;
    estimated_monthly_rent: number;
    estimated_yearly_rent: number;
    gross_yield_percentage: number;
  };
}

export interface ScoreBadgeData {
  score: number;
  color: 'green' | 'yellow' | 'red';
  label: string;
}

// =====================================================
// EVALUATION FUNCTIONS
// =====================================================

/**
 * Trigger AI evaluation for a property
 * Calls the Supabase Edge Function to evaluate the property
 */
export async function evaluatePropertyInvestment(
  propertyId: string
): Promise<EvaluationResponse> {
  const { data, error } = await supabase.functions.invoke('evaluate-investment', {
    body: { propertyId },
  });

  if (error) {
    console.error('Error evaluating property:', error);
    throw new Error(`Failed to evaluate property: ${error.message}`);
  }

  return data as EvaluationResponse;
}

/**
 * Get the latest evaluation for a property
 */
export async function getPropertyEvaluation(
  propertyId: string
): Promise<PropertyAIEvaluation | null> {
  const { data, error } = await supabase
    .from('property_ai_evaluations')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching property evaluation:', error);
    throw new Error(`Failed to fetch evaluation: ${error.message}`);
  }

  return data;
}

/**
 * Get all evaluations for a property (history)
 */
export async function getPropertyEvaluationHistory(
  propertyId: string,
  limit: number = 10
): Promise<PropertyAIEvaluation[]> {
  const { data, error } = await supabase
    .from('property_ai_evaluations')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching evaluation history:', error);
    throw new Error(`Failed to fetch evaluation history: ${error.message}`);
  }

  return data || [];
}

/**
 * Get score badge data for display
 */
export function getScoreBadgeData(score: number | null | undefined): ScoreBadgeData | null {
  if (score === null || score === undefined) {
    return null;
  }

  let color: 'green' | 'yellow' | 'red';
  let label: string;

  if (score >= 70) {
    color = 'green';
    label = 'Ausgezeichnet';
  } else if (score >= 40) {
    color = 'yellow';
    label = 'Durchschnittlich';
  } else {
    color = 'red';
    label = 'Risiko';
  }

  return { score, color, label };
}

/**
 * Get color class for Tailwind CSS
 */
export function getScoreColorClass(color: 'green' | 'yellow' | 'red' | null | undefined): string {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'red':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get properties with high investment scores
 */
export async function getTopInvestmentProperties(limit: number = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'active')
    .not('ai_investment_score', 'is', null)
    .gte('ai_investment_score', 70) // Only green properties
    .order('ai_investment_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top investment properties:', error);
    throw new Error(`Failed to fetch top properties: ${error.message}`);
  }

  return data || [];
}

/**
 * Check if a property needs re-evaluation
 * Re-evaluate if score is older than 30 days
 */
export function needsReEvaluation(scoreCalculatedAt: string | null | undefined): boolean {
  if (!scoreCalculatedAt) return true;

  const scoreDate = new Date(scoreCalculatedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - scoreDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff > 30; // Re-evaluate after 30 days
}

/**
 * Batch evaluate multiple properties
 */
export async function batchEvaluateProperties(
  propertyIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const propertyId of propertyIds) {
    try {
      await evaluatePropertyInvestment(propertyId);
      success.push(propertyId);
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to evaluate property ${propertyId}:`, error);
      failed.push(propertyId);
    }
  }

  return { success, failed };
}
