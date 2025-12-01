/**
 * Supabase Edge Function: AI Investment Evaluation
 *
 * Evaluates properties from an investor perspective using AI
 * Analyzes: Location, Price, Yield, Appreciation, Features
 * Returns: Investment score (0-100) with color rating (green/yellow/red)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluationRequest {
  propertyId: string;
}

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  address: string;
  price: number;
  rooms: number;
  sqm: number;
  features: string[];
  year_built?: number;
}

interface LocationAnalysis {
  score: number; // 0-100
  reasoning: string;
  infrastructure_rating: number;
  neighborhood_rating: number;
  development_potential: number;
}

interface AppreciationAnalysis {
  score: number; // 0-100
  reasoning: string;
  market_trend: string;
  growth_potential: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { propertyId }: EvaluationRequest = await req.json();

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'Property ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch property data
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return new Response(
        JSON.stringify({ error: 'Property not found', details: propertyError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Evaluating property:', property.title, property.location);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // 1. AI-POWERED LOCATION ANALYSIS (30%)
    // ========================================

    const locationPrompt = `Du bist ein Immobilien-Investitions-Experte. Analysiere die LAGE dieser Immobilie aus Investorensicht.

Immobilie: ${property.title}
Adresse: ${property.address}
Lage: ${property.location}
Beschreibung: ${property.description}

Bewerte die Lage auf einer Skala von 0-100 basierend auf:
1. Infrastruktur (ÖPNV, Schulen, Ärzte, Einkaufsmöglichkeiten)
2. Nachbarschaft & Sicherheit
3. Entwicklungspotential der Region

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "score": 0-100,
  "reasoning": "Kurze Begründung (2-3 Sätze)",
  "infrastructure_rating": 0-100,
  "neighborhood_rating": 0-100,
  "development_potential": 0-100
}`;

    const locationAnalysis = await callOpenAI<LocationAnalysis>(openaiApiKey, locationPrompt);

    // ========================================
    // 2. AI-POWERED APPRECIATION ANALYSIS (15%)
    // ========================================

    const appreciationPrompt = `Du bist ein Immobilien-Investitions-Experte. Analysiere das WERTSTEIGERUNGS-POTENTIAL dieser Immobilie.

Immobilie: ${property.title}
Lage: ${property.location}
Preis: ${property.price.toLocaleString('de-DE')} €
Baujahr: ${property.year_built || 'Unbekannt'}

Bewerte das Wertsteigerungs-Potential auf einer Skala von 0-100 basierend auf:
1. Regionale Marktentwicklung
2. Geplante Infrastrukturprojekte in der Region
3. Nachfrage-Trends

Antworte NUR mit einem JSON-Objekt in folgendem Format:
{
  "score": 0-100,
  "reasoning": "Kurze Begründung (2-3 Sätze)",
  "market_trend": "steigend|stabil|fallend",
  "growth_potential": 0-100
}`;

    const appreciationAnalysis = await callOpenAI<AppreciationAnalysis>(openaiApiKey, appreciationPrompt);

    // ========================================
    // 3. RULE-BASED PRICE ANALYSIS (25%)
    // ========================================

    // Calculate price per sqm
    const pricePerSqm = property.price / property.sqm;

    // Average price per sqm in Germany: ~3000-5000 € (varies by location)
    // This should ideally come from a market data API
    const avgPricePerSqm = 4000;

    let priceScore = 0;
    if (pricePerSqm <= avgPricePerSqm * 0.7) {
      priceScore = 100; // Significantly below average - excellent
    } else if (pricePerSqm <= avgPricePerSqm * 0.85) {
      priceScore = 85; // Below average - very good
    } else if (pricePerSqm <= avgPricePerSqm) {
      priceScore = 70; // At average - good
    } else if (pricePerSqm <= avgPricePerSqm * 1.15) {
      priceScore = 50; // Slightly above average - moderate
    } else if (pricePerSqm <= avgPricePerSqm * 1.3) {
      priceScore = 30; // Above average - poor
    } else {
      priceScore = 10; // Significantly above average - very poor
    }

    // ========================================
    // 4. RULE-BASED YIELD ANALYSIS (25%)
    // ========================================

    // Estimate monthly rent: ~0.4% of purchase price (rule of thumb)
    const estimatedMonthlyRent = property.price * 0.004;
    const estimatedYearlyRent = estimatedMonthlyRent * 12;
    const grossYieldPercentage = (estimatedYearlyRent / property.price) * 100;

    let yieldScore = 0;
    if (grossYieldPercentage >= 5) {
      yieldScore = 100; // Excellent yield
    } else if (grossYieldPercentage >= 4) {
      yieldScore = 85; // Very good yield
    } else if (grossYieldPercentage >= 3) {
      yieldScore = 70; // Good yield
    } else if (grossYieldPercentage >= 2.5) {
      yieldScore = 50; // Moderate yield
    } else if (grossYieldPercentage >= 2) {
      yieldScore = 30; // Low yield
    } else {
      yieldScore = 10; // Very low yield
    }

    // ========================================
    // 5. RULE-BASED FEATURES ANALYSIS (5%)
    // ========================================

    const features = property.features || [];
    const desirableFeatures = [
      'Balkon',
      'Terrasse',
      'Garten',
      'Aufzug',
      'Parkplatz',
      'Garage',
      'Fußbodenheizung',
      'Smart Home',
      'Neubau',
      'barrierefrei',
    ];

    const matchedFeatures = features.filter((f) => desirableFeatures.includes(f));
    const featuresScore = Math.min(100, (matchedFeatures.length / desirableFeatures.length) * 100 * 1.5);

    // ========================================
    // 6. CALCULATE OVERALL SCORE
    // ========================================

    const weights = {
      location: 0.30,
      price: 0.25,
      yield: 0.25,
      appreciation: 0.15,
      features: 0.05,
    };

    const overallScore = Math.round(
      locationAnalysis.score * weights.location +
      priceScore * weights.price +
      yieldScore * weights.yield +
      appreciationAnalysis.score * weights.appreciation +
      featuresScore * weights.features
    );

    // Determine color rating
    let colorRating: 'green' | 'yellow' | 'red';
    if (overallScore >= 70) {
      colorRating = 'green'; // Excellent investment
    } else if (overallScore >= 40) {
      colorRating = 'yellow'; // Moderate investment
    } else {
      colorRating = 'red'; // Risky investment
    }

    // ========================================
    // 7. SAVE TO DATABASE
    // ========================================

    const evaluationData = {
      property_id: propertyId,
      overall_score: overallScore,
      color_rating: colorRating,
      location_score: Math.round(locationAnalysis.score),
      price_score: Math.round(priceScore),
      yield_score: Math.round(yieldScore),
      appreciation_score: Math.round(appreciationAnalysis.score),
      features_score: Math.round(featuresScore),
      ai_reasoning: `${locationAnalysis.reasoning} ${appreciationAnalysis.reasoning}`,
      location_analysis: locationAnalysis.reasoning,
      market_analysis: appreciationAnalysis.reasoning,
      estimated_monthly_rent: estimatedMonthlyRent,
      estimated_yearly_rent: estimatedYearlyRent,
      gross_yield_percentage: grossYieldPercentage,
      price_per_sqm: pricePerSqm,
      ai_model: 'gpt-4o',
      evaluation_version: '1.0',
    };

    const { data: evaluation, error: evalError } = await supabase
      .from('property_ai_evaluations')
      .insert(evaluationData)
      .select()
      .single();

    if (evalError) {
      console.error('Error saving evaluation:', evalError);
      return new Response(
        JSON.stringify({ error: 'Failed to save evaluation', details: evalError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update property with score
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        ai_investment_score: overallScore,
        score_color: colorRating,
        score_breakdown: {
          location: Math.round(locationAnalysis.score),
          price: Math.round(priceScore),
          yield: Math.round(yieldScore),
          appreciation: Math.round(appreciationAnalysis.score),
          features: Math.round(featuresScore),
        },
        score_calculated_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    if (updateError) {
      console.error('Error updating property:', updateError);
    }

    console.log('Evaluation completed:', {
      propertyId,
      overallScore,
      colorRating,
    });

    return new Response(
      JSON.stringify({
        success: true,
        evaluation,
        property_id: propertyId,
        overall_score: overallScore,
        color_rating: colorRating,
        breakdown: {
          location_score: Math.round(locationAnalysis.score),
          price_score: Math.round(priceScore),
          yield_score: Math.round(yieldScore),
          appreciation_score: Math.round(appreciationAnalysis.score),
          features_score: Math.round(featuresScore),
        },
        metrics: {
          price_per_sqm: pricePerSqm,
          estimated_monthly_rent: estimatedMonthlyRent,
          estimated_yearly_rent: estimatedYearlyRent,
          gross_yield_percentage: grossYieldPercentage,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in evaluate-investment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Helper function to call OpenAI API and parse JSON response
 */
async function callOpenAI<T>(apiKey: string, prompt: string): Promise<T> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Immobilien-Investitions-Experte. Antworte immer im JSON-Format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error:', errorData);
    throw new Error('AI service error');
  }

  const aiData = await response.json();
  const contentText = aiData.choices[0].message.content.trim();

  try {
    return JSON.parse(contentText) as T;
  } catch (parseError) {
    console.error('Failed to parse AI response:', contentText);
    throw new Error('Invalid AI response format');
  }
}
