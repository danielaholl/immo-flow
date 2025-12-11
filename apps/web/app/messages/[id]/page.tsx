'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * This page redirects to the main messages page with the conversation ID as a query parameter
 * This maintains backward compatibility for direct links to conversations
 */
export default function ConversationRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id as string;

  useEffect(() => {
    if (conversationId) {
      // Redirect to main messages page with conversation ID
      router.replace(`/messages?id=${conversationId}`);
    } else {
      // If no ID, just redirect to messages page
      router.replace('/messages');
    }
  }, [conversationId, router]);

  return null;
}
