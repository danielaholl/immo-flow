/**
 * Supabase Edge Function: AI Chat for Property Assistance
 *
 * This function handles AI-powered chat for property inquiries
 * Uses OpenAI or similar API to provide intelligent responses
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  propertyId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { message, propertyId, conversationHistory = [] }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch property details if propertyId is provided
    let propertyContext = '';
    if (propertyId) {
      const { data: property, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (!error && property) {
        propertyContext = `
Property Details:
- Title: ${property.title}
- Location: ${property.location}
- Price: ${property.price}€
- Size: ${property.sqm}m²
- Rooms: ${property.rooms}
- Features: ${property.features.join(', ')}
- AI Score: ${property.ai_score}
${property.description ? `- Description: ${property.description}` : ''}
`;
      }
    }

    // Build system prompt
    const systemPrompt = `You are an AI assistant for ImmoFlow, a property investment platform in Germany. Your role is to help users with property-related questions.

${propertyContext}

Guidelines:
- Be helpful and professional
- Provide investment insights based on the property data
- Answer questions about location, pricing, features, and investment potential
- If you don't have enough information, ask clarifying questions
- Use German terminology where appropriate
- Be concise but informative

Remember: You're helping users make informed investment decisions.`;

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective model, or use 'gpt-4' for better quality
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
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
    const reply = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({
        message: reply,
        propertyId,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
