/**
 * OpenAI Client Singleton
 * Shared OpenAI client instance used across all services
 */
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Get or create shared OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

// Export a getter for backwards compatibility
export const openai = new Proxy({} as OpenAI, {
  get: (_, prop) => {
    const client = getOpenAIClient();
    return (client as any)[prop];
  },
});
