/**
 * Email Service
 * Handles sending emails for notifications
 */

import sgMail from '@sendgrid/mail';
import { createLogger } from '@rendito/utils';

const log = createLogger('email-service');

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@rendito.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  log.info('SendGrid initialized');
}

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
  try {
    if (SENDGRID_API_KEY) {
      // Production: use SendGrid
      await sgMail.send({
        to: options.to,
        from: SENDER_EMAIL,
        subject: options.subject,
        text: options.textContent,
        html: options.htmlContent,
      });
      log.info('Email sent via SendGrid', {
        to: options.to,
        subject: options.subject,
      });
      return true;
    } else {
      // Development: just log the email
      log.info('Email would be sent (development mode)', {
        to: options.to,
        subject: options.subject,
      });
      return true;
    }
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
            Rendito - Deine Immobilienplattform
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

Rendito - Deine Immobilienplattform
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
            Rendito - Deine Immobilienplattform
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

Rendito - Deine Immobilienplattform
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
            Rendito - Deine Immobilienplattform
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

Rendito - Deine Immobilienplattform
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

/**
 * Send provider invitation email
 */
export async function sendProviderInvitation({
  providerEmail,
  providerName,
  buyerName,
  propertyTitle,
  signupLink,
}: {
  providerEmail: string;
  providerName: string;
  buyerName: string;
  propertyTitle: string;
  signupLink: string;
}): Promise<boolean> {
  const subject = `${buyerName} möchte Sie über Rendito kontaktieren`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .cta-button { display: inline-block; background: #667eea; color: white;
                      padding: 12px 30px; text-decoration: none; border-radius: 6px;
                      font-weight: bold; margin: 20px 0; }
        .benefits { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .benefit-item { margin: 10px 0; padding-left: 25px; position: relative; }
        .benefit-item:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏡 Rendito</h1>
          <p>Die Plattform für smarte Immobilien-Investoren</p>
        </div>

        <div class="content">
          <h2>Sehr geehrte/r ${escapeHtml(providerName)},</h2>

          <p><strong>${escapeHtml(buyerName)}</strong> interessiert sich für Ihre Immobilie <strong>"${escapeHtml(propertyTitle)}"</strong>
          und möchte Sie über Rendito kontaktieren.</p>

          <p>Rendito ist eine moderne Plattform, die Immobilienanbieter und Investoren zusammenbringt.
          Als Anbieter profitieren Sie von:</p>

          <div class="benefits">
            <div class="benefit-item"><strong>🏠 1 kostenloses Objekt inserieren</strong> - Präsentieren Sie Ihre Immobilie ohne Kosten</div>
            <div class="benefit-item"><strong>🤖 3 kostenlose KI-Bewertungen</strong> - Professionelle Property-Analysen im Wert von 150€</div>
            <div class="benefit-item"><strong>💬 Direkter Chat mit Interessenten</strong> - Schnellere Kommunikation, kürzere Verkaufszyklen</div>
            <div class="benefit-item"><strong>📊 Erweiterte Analytics</strong> - Sehen Sie, wer sich für Ihre Objekte interessiert</div>
            <div class="benefit-item"><strong>🎯 Qualifizierte Leads</strong> - Nur ernsthaft Interessierte mit geprüftem Kaufinteresse</div>
            <div class="benefit-item"><strong>💰 Kostenlose Nutzung</strong> - Kein Makler-Abo nötig für die Kommunikation</div>
          </div>

          <p style="text-align: center;">
            <a href="${escapeHtml(signupLink)}" class="cta-button">Kostenlos registrieren & ${escapeHtml(buyerName)} antworten</a>
          </p>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Mit der Registrierung erhalten Sie sofort:
            <br>✓ 1 kostenloses Objekt-Inserat
            <br>✓ 3 kostenlose KI-Bewertungen für Ihre Objekte
            <br>✓ Zugang zum Chat mit ${escapeHtml(buyerName)}
          </p>
        </div>

        <div class="footer">
          <p>Diese Einladung wurde automatisch generiert, weil ${escapeHtml(buyerName)} Sie kontaktieren möchte.</p>
          <p>© 2024 Rendito - Smarte Immobilien-Investments</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Sehr geehrte/r ${providerName},

${buyerName} interessiert sich für Ihre Immobilie "${propertyTitle}" und möchte Sie über Rendito kontaktieren.

Rendito ist eine moderne Plattform, die Immobilienanbieter und Investoren zusammenbringt.

Ihre Vorteile als Anbieter:
- 🏠 1 kostenloses Objekt inserieren
- 🤖 3 kostenlose KI-Bewertungen (Wert: 150€)
- 💬 Direkter Chat mit Interessenten
- 📊 Erweiterte Analytics
- 🎯 Qualifizierte Leads
- 💰 Kostenlose Nutzung

Jetzt kostenlos registrieren: ${signupLink}

Mit der Registrierung erhalten Sie sofort Ihr kostenloses Inserat und können ${buyerName} antworten.

© 2024 Rendito
  `;

  return sendEmail({
    to: providerEmail,
    subject,
    htmlContent,
    textContent,
  });
}
