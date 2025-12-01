/**
 * Supabase Edge Function: Generate Search Profile
 *
 * This function uses OpenAI to analyze user's search history
 * and generate a personalized search profile
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateProfileRequest {
  userId: string;
}

interface SearchProfile {
  summary: string;
  preferredLocations: string[];
  priceRange?: { min?: number; max?: number };
  preferredRooms?: number[];
  preferredFeatures: string[];
  recommendations: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { userId }: GenerateProfileRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's search history (last 20 searches)
    const { data: searchHistory, error: searchError } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('last_searched_at', { ascending: false })
      .limit(20);

    if (searchError) {
      console.error('Database error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: searchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!searchHistory || searchHistory.length === 0) {
      return new Response(
        JSON.stringify({
          profile: {
            summary: 'Noch keine Suchhistorie vorhanden. Beginnen Sie mit der Suche, um Ihr persönliches Suchprofil zu erstellen.',
            preferredLocations: [],
            preferredFeatures: [],
            recommendations: [
              'Nutzen Sie die AI-Suche, um Immobilien zu finden',
              'Speichern Sie interessante Immobilien als Favoriten',
              'Je mehr Sie suchen, desto besser wird Ihr Profil',
            ],
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search history summary for AI
    const historyText = searchHistory
      .map((search, index) => {
        const criteria = search.criteria || {};
        return `Suche ${index + 1}: "${search.query}"
- Ort: ${criteria.location || 'Nicht angegeben'}
- Zimmer: ${criteria.rooms || 'Nicht angegeben'}
- Preisbereich: ${criteria.minPrice ? `ab ${criteria.minPrice}€` : ''}${criteria.maxPrice ? ` bis ${criteria.maxPrice}€` : ''}
- Features: ${criteria.features?.join(', ') || 'Keine'}
- Ergebnisse: ${search.results_count}
- Zuletzt gesucht: ${new Date(search.last_searched_at).toLocaleDateString('de-DE')}`;
      })
      .join('\n\n');

    // Build system prompt
    const systemPrompt = `Du bist ein AI-Assistent, der Suchprofile für Immobiliensuchende erstellt.
Analysiere die Suchhistorie des Benutzers und erstelle ein detailliertes Suchprofil.

Antworte NUR mit einem gültigen JSON-Objekt im folgenden Format (keine zusätzlichen Erklärungen):
{
  "summary": "Eine prägnante Zusammenfassung (2-3 Sätze) der Suchpräferenzen des Benutzers",
  "preferredLocations": ["Liste der bevorzugten Orte"],
  "priceRange": { "min": Mindestpreis (optional), "max": Höchstpreis (optional) },
  "preferredRooms": [Array der bevorzugten Zimmeranzahlen],
  "preferredFeatures": ["Liste der häufig gesuchten Features"],
  "recommendations": ["3-5 personalisierte Empfehlungen für die Immobiliensuche"]
}

Wichtig:
- Identifiziere Muster in den Suchkriterien
- Berücksichtige die Häufigkeit von Suchen
- Gib konkrete, umsetzbare Empfehlungen
- Bleibe spezifisch und relevant`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Erstelle ein Suchprofil basierend auf dieser Suchhistorie:\n\n${historyText}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await openaiResponse.json();
    const profileText = aiData.choices[0].message.content.trim();

    // Parse the JSON response
    let profile: SearchProfile;
    try {
      profile = JSON.parse(profileText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', profileText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ profile }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-search-profile function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
