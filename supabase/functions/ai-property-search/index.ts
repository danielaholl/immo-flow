/**
 * Supabase Edge Function: AI-Powered Property Search
 *
 * This function uses OpenAI to parse natural language queries
 * and search for properties based on extracted criteria
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
}

interface SearchCriteria {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  minSqm?: number;
  maxSqm?: number;
  features?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { query }: SearchRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Build system prompt for extracting search criteria
    const systemPrompt = `Du bist ein Assistent für eine Immobilien-Suchplattform.
Deine Aufgabe ist es, natürlichsprachliche Suchanfragen zu analysieren und strukturierte Suchkriterien zu extrahieren.

Extrahiere aus der Benutzeranfrage folgende Informationen:
- location: Ort/Stadt (z.B. "München", "Berlin Mitte", "Hamburg")
- minPrice: Mindestpreis in Euro
- maxPrice: Höchstpreis in Euro
- rooms: Anzahl der Zimmer (als Zahl)
- minSqm: Mindestgröße in Quadratmetern
- maxSqm: Maximalgröße in Quadratmetern
- features: Array von Features (z.B. ["Balkon", "Fußbodenheizung", "Neubau", "Garten", "Terrasse", "Keller", "Aufzug", "Parkplatz", "barrierefrei"])

Antworte NUR mit einem gültigen JSON-Objekt. Keine zusätzlichen Erklärungen. Wenn ein Kriterium nicht erwähnt wird, lasse es weg.

Beispiele:
Anfrage: "3 Zimmer Wohnung in München unter 500000€"
Antwort: {"location": "München", "maxPrice": 500000, "rooms": 3}

Anfrage: "Suche eine 4 Zimmer Wohnung in Berlin Mitte mit Balkon und Fußbodenheizung"
Antwort: {"location": "Berlin Mitte", "rooms": 4, "features": ["Balkon", "Fußbodenheizung"]}

Anfrage: "Neubau in Hamburg über 100qm unter 600000€"
Antwort: {"location": "Hamburg", "minSqm": 100, "maxPrice": 600000, "features": ["Neubau"]}`;

    // Call OpenAI API to extract search criteria
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
          { role: 'user', content: query },
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 200,
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
    const criteriaText = aiData.choices[0].message.content.trim();

    // Parse the JSON response
    let criteria: SearchCriteria;
    try {
      criteria = JSON.parse(criteriaText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', criteriaText);
      // Fallback: use simple text search
      criteria = { location: query };
    }

    console.log('Extracted criteria:', criteria);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the database query
    let dbQuery = supabase
      .from('properties')
      .select('*')
      .eq('status', 'active');

    // Apply filters
    if (criteria.location) {
      dbQuery = dbQuery.or(`location.ilike.%${criteria.location}%,address.ilike.%${criteria.location}%`);
    }

    if (criteria.minPrice !== undefined) {
      dbQuery = dbQuery.gte('price', criteria.minPrice);
    }

    if (criteria.maxPrice !== undefined) {
      dbQuery = dbQuery.lte('price', criteria.maxPrice);
    }

    if (criteria.rooms !== undefined) {
      dbQuery = dbQuery.eq('rooms', criteria.rooms);
    }

    if (criteria.minSqm !== undefined) {
      dbQuery = dbQuery.gte('sqm', criteria.minSqm);
    }

    if (criteria.maxSqm !== undefined) {
      dbQuery = dbQuery.lte('sqm', criteria.maxSqm);
    }

    // Filter by features (checking if features array contains any of the requested features)
    if (criteria.features && criteria.features.length > 0) {
      // Build OR conditions for features
      const featureConditions = criteria.features.map(
        (feature) => `features.cs.{"${feature}"}`
      ).join(',');
      dbQuery = dbQuery.or(featureConditions);
    }

    // Order by relevance (you can customize this)
    dbQuery = dbQuery.order('created_at', { ascending: false }).limit(50);

    const { data: properties, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        properties: properties || [],
        criteria,
        query,
        count: properties?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in ai-property-search function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
