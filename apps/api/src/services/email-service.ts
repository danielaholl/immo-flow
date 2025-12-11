/**
 * Email Service
 * Handles sending emails for notifications
 */

import { createLogger } from './logger.js'@immoflow/utils';

const log = createLogger('email-service');

interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

interface MessageNotification {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  propertyTitle: string;
  messagePreview: string;
  conversationUrl: string;
}

/**
 * Initialize email service
 * Currently supports logging (for development)
 * Can be extended to support SendGrid, Mailgun, AWS SES, etc.
 */
export function initializeEmailService(): void {
  const provider = process.env.EMAIL_PROVIDER || 'log';

  log.info('Email service initialized', {
    provider,
  });
}

/**
 * Send a generic email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || 'log';

  try {
    if (provider === 'log') {
      // Development: just log the email
      log.info('Email would be sent (development mode)', {
        to: options.to,
        subject: options.subject,
      });
      return true;
    }

    // TODO: Implement actual email providers (SendGrid, Mailgun, etc.)
    log.warn('Email provider not implemented', {
      provider,
      to: options.to,
      subject: options.subject,
    });
    return false;
  } catch (error) {
    log.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send message notification email to buyer/seller
 */
export async function sendMessageNotificationEmail(
  notification: MessageNotification
): Promise<boolean> {
  const subject = `Neue Nachricht zu "${notification.propertyTitle}"`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2>Neue Nachricht erhalten</h2>

          <p>Hallo ${escapeHtml(notification.recipientName)},</p>

          <p>Du hast eine neue Nachricht von <strong>${escapeHtml(notification.senderName)}</strong> zur Immobilie erhalten:</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${escapeHtml(notification.propertyTitle)}</strong></p>
            <p style="margin: 10px 0 0 0; color: #666;">"${escapeHtml(notification.messagePreview.substring(0, 150))}"${notification.messagePreview.length > 150 ? '...' : ''}</p>
          </div>

          <p>
            <a href="${escapeHtml(notification.conversationUrl)}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Nachricht antworten
            </a>
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">
            ImmoFlow - Deine Immobilienplattform
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Neue Nachricht erhalten

Hallo ${notification.recipientName},

Du hast eine neue Nachricht von ${notification.senderName} zur Immobilie erhalten:

${notification.propertyTitle}

"${notification.messagePreview.substring(0, 150)}"${notification.messagePreview.length > 150 ? '...' : ''}

Bitte antworte hier: ${notification.conversationUrl}

ImmoFlow - Deine Immobilienplattform
  `;

  return sendEmail({
    to: notification.recipientEmail,
    subject,
    htmlContent,
    textContent,
  });
}

/**
 * Send email to seller when buyer asks a question
 */
export async function sendSellerQuestionNotificationEmail(
  sellerEmail: string,
  sellerName: string,
  buyerName: string,
  propertyTitle: string,
  question: string,
  conversationUrl: string
): Promise<boolean> {
  const subject = `Neue Frage zu Ihrer Anzeige: ${propertyTitle}`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2>Neue Frage zu Ihrer Immobilie</h2>

          <p>Hallo ${escapeHtml(sellerName)},</p>

          <p><strong>${escapeHtml(buyerName)}</strong> hat eine Frage zu Ihrer Immobilie gestellt:</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${escapeHtml(propertyTitle)}</strong></p>
            <p style="margin: 10px 0 0 0; color: #666;">"${escapeHtml(question.substring(0, 200))}"${question.length > 200 ? '...' : ''}</p>
          </div>

          <p>Bitte antworten Sie der Frage:</p>

          <p>
            <a href="${escapeHtml(conversationUrl)}" style="display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Frage antworten
            </a>
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">
            ImmoFlow - Deine Immobilienplattform
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Neue Frage zu Ihrer Immobilie

Hallo ${sellerName},

${buyerName} hat eine Frage zu Ihrer Immobilie gestellt:

${propertyTitle}

"${question.substring(0, 200)}"${question.length > 200 ? '...' : ''}

Bitte antworten Sie der Frage: ${conversationUrl}

ImmoFlow - Deine Immobilienplattform
  `;

  return sendEmail({
    to: sellerEmail,
    subject,
    htmlContent,
    textContent,
  });
}

/**
 * Send email to buyer when seller replies
 */
export async function sendBuyerReplyNotificationEmail(
  buyerEmail: string,
  buyerName: string,
  sellerName: string,
  propertyTitle: string,
  messagePreview: string,
  conversationUrl: string
): Promise<boolean> {
  const subject = `${sellerName} hat auf Ihre Frage geantwortet`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2>Neue Antwort erhalten</h2>

          <p>Hallo ${escapeHtml(buyerName)},</p>

          <p><strong>${escapeHtml(sellerName)}</strong> hat auf Ihre Frage geantwortet:</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${escapeHtml(propertyTitle)}</strong></p>
            <p style="margin: 10px 0 0 0; color: #666;">"${escapeHtml(messagePreview.substring(0, 150))}"${messagePreview.length > 150 ? '...' : ''}</p>
          </div>

          <p>
            <a href="${escapeHtml(conversationUrl)}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Antwort ansehen
            </a>
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">
            ImmoFlow - Deine Immobilienplattform
          </p>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Neue Antwort erhalten

Hallo ${buyerName},

${sellerName} hat auf Ihre Frage geantwortet:

${propertyTitle}

"${messagePreview.substring(0, 150)}"${messagePreview.length > 150 ? '...' : ''}

Antwort ansehen: ${conversationUrl}

ImmoFlow - Deine Immobilienplattform
  `;

  return sendEmail({
    to: buyerEmail,
    subject,
    htmlContent,
    textContent,
  });
}

/**
 * HTML escape to prevent XSS in emails
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
