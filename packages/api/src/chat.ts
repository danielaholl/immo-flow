/**
 * AI Chat API
 */

import { supabase } from '@immoflow/database';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendChatMessageParams {
  message: string;
  propertyId?: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  propertyId?: string;
  timestamp: string;
}

/**
 * Send a message to the AI chat assistant
 */
export async function sendChatMessage({
  message,
  propertyId,
  conversationHistory = [],
}: SendChatMessageParams): Promise<ChatResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        propertyId,
        conversationHistory,
      },
    });

    if (error) {
      console.error('Error calling ai-chat function:', error);
      throw new Error(error.message || 'Failed to get AI response');
    }

    return data as ChatResponse;
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
}

/**
 * Get property search suggestions based on user query
 */
export async function getSearchSuggestions(query: string): Promise<string[]> {
  try {
    const response = await sendChatMessage({
      message: `Bitte gib mir 3 Suchvorschläge basierend auf dieser Anfrage: "${query}". Antworte nur mit den Vorschlägen, einer pro Zeile, ohne Nummerierung.`,
    });

    // Parse suggestions from response
    const suggestions = response.message
      .split('\n')
      .filter((line) => line.trim())
      .slice(0, 3);

    return suggestions;
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}
