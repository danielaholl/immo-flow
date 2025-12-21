export type PlanType =
  | 'free'
  | 'investor'
  | 'pro'
  | 'sucher'
  | 'makler_pro'
  | 'makler_enterprise'
  | 'verkauf_starter'
  | 'verkauf_premium';

export interface PricingPlan {
  name: string;
  planId: PlanType | null; // null for teaser cards or contact forms
  price: number;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  isTeaser?: boolean;
  teaserLink?: string;
  isContactForm?: boolean; // For Agentur plan
  ctaText: string;
}

export const investorPlans: PricingPlan[] = [
  {
    name: 'Free',
    planId: 'free',
    price: 0,
    period: 'Monat',
    description: 'Zum Reinschnuppern',
    features: [
      'Unbegrenzte Swipes',
      '5 Favoriten speichern',
      'Personalisiertes Feed (lernt deine Kriterien)',
      'KI-Score Anzeige (0-100)',
      'Nachrichten an Verkäufer',
      'KI-Suche (natürliche Sprache)',
    ],
    ctaText: 'Kostenlos starten',
  },
  {
    name: 'Investor',
    planId: 'investor',
    price: 29,
    period: 'Monat',
    description: 'Vollzugriff auf alle Analysen',
    isPopular: true,
    features: [
      'Alles aus Free',
      'Unbegrenzte Favoriten',
      'Unbegrenzte KI-Analysen',
      'SWOT-Analyse',
      'Rendite-Kalkulator',
      'Finanzierungsrechner',
      'Cashflow-Projektion',
      'Email-Alerts für neue Objekte',
    ],
    ctaText: 'Investor wählen',
  },
  {
    name: 'Pro',
    planId: 'pro',
    price: 79,
    period: 'Monat',
    description: 'Für professionelle Investoren',
    features: [
      'Alles aus Investor',
      'Verhandlungsempfehlungen',
      'Portfolio-Übersicht',
      'Szenarien speichern',
      'PDF-Export',
      'Zugang zum Investoren-Club',
      'Priority Support',
    ],
    ctaText: 'Pro wählen',
  },
];

export const maklerPlans: PricingPlan[] = [
  {
    name: 'Pro',
    planId: 'makler_pro',
    price: 99,
    period: 'Monat',
    description: 'Für Einzelmakler',
    features: [
      '50 Objekte verwalten',
      'KI-Chat Objekterstellung',
      '20 PDF-Imports/Monat',
      'Video-Upload',
      'Online-Exposé mit QR-Code',
      'Dokument-Management',
      'Interessenten-Nachrichten',
      'Lead-Dashboard',
      'Email Support',
    ],
    ctaText: 'Pro wählen',
  },
  {
    name: 'Enterprise',
    planId: 'makler_enterprise',
    price: 249,
    period: 'Monat',
    description: 'Für Maklerbüros',
    isPopular: true,
    features: [
      'Alles aus Pro',
      'Unbegrenzte Objekte',
      'Unbegrenzte Imports',
      'KI-Auto-Antworten',
      'Conversion-Tracking',
      'Monatliche Reports',
      '3 Team-Seats',
      'Chat Support',
    ],
    ctaText: 'Enterprise wählen',
  },
  {
    name: 'Agentur',
    planId: null,
    price: 499,
    period: 'Monat',
    description: 'Für große Agenturen',
    isContactForm: true,
    features: [
      'Alles aus Enterprise',
      '10+ Team-Seats',
      'Premium-Platzierung in Suche',
      'Erweiterte Analytics',
      'Onboarding & Schulung',
      'Dedicated Support',
    ],
    ctaText: 'Kontakt aufnehmen',
  },
];

export const sucherPlans: PricingPlan[] = [
  {
    name: 'Free',
    planId: 'free',
    price: 0,
    period: 'Monat',
    description: 'Zum Reinschnuppern',
    features: [
      'Unbegrenzte Swipes',
      '5 Favoriten speichern',
      'Personalisiertes Feed (lernt deine Vorlieben)',
      'KI-Score Anzeige (0-100)',
      'Nachrichten an Verkäufer',
      'KI-Suche (natürliche Sprache)',
    ],
    ctaText: 'Kostenlos starten',
  },
  {
    name: 'Sucher',
    planId: 'sucher',
    price: 9,
    period: 'Monat',
    description: 'Finde dein Traumzuhause',
    isPopular: true,
    features: [
      'Alles aus Free',
      'Unbegrenzte Favoriten',
      'Budget-Suche (Was kann ich mir leisten?)',
      'KI-Preis-Check (Ist der Preis fair?)',
      'Nebenkosten-Rechner',
      'Wohn-Lage-Bewertung',
      'Email-Alerts für neue Objekte',
    ],
    ctaText: 'Sucher wählen',
  },
  {
    name: 'Investor werden?',
    planId: null,
    price: 29,
    period: 'Monat',
    description: 'Du überlegst, in Immobilien zu investieren?',
    isTeaser: true,
    teaserLink: 'investor',
    features: [
      'Rendite-Kalkulator',
      'SWOT-Analyse',
      'Cashflow-Projektion',
      'Finanzierungsrechner',
      'Portfolio-Übersicht',
    ],
    ctaText: 'Investor-Plan ansehen →',
  },
];

export const verkaufPlans: PricingPlan[] = [
  {
    name: 'Starter',
    planId: 'verkauf_starter',
    price: 99,
    period: 'einmalig',
    description: 'Für den schnellen Verkauf',
    features: [
      'Immobilie inserieren',
      'KI-generierte Beschreibung',
      '3 Monate online',
      'Bis zu 20 Fotos',
      'Anfragen per Messaging',
      'Basis-Statistiken',
    ],
    ctaText: 'Starter wählen',
  },
  {
    name: 'Premium',
    planId: 'verkauf_premium',
    price: 249,
    period: 'einmalig',
    description: 'Maximale Sichtbarkeit',
    isPopular: true,
    features: [
      'Alles aus Starter',
      'KI-Preisanalyse & Empfehlung',
      '6 Monate online',
      'Bis zu 50 Fotos',
      'Exposé-PDF Export',
      'Highlight in Suchergebnissen',
      'Detaillierte Statistiken',
    ],
    ctaText: 'Premium wählen',
  },
  {
    name: 'Erfolgspaket',
    planId: null,
    price: 0,
    period: '0,5% bei Verkauf',
    description: 'Zahle nur bei Erfolg',
    isContactForm: true,
    features: [
      'Alles aus Premium',
      '12 Monate online',
      'Unbegrenzte Fotos',
      'Virtuelle Besichtigung',
      'Käufer-Bonitätsprüfung',
      'Verhandlungsunterstützung',
      'Notartermin-Koordination',
    ],
    ctaText: 'Erfolgspaket wählen',
  },
];

export const investorFAQs = [
  {
    question: 'Was ist das personalisierte Feed?',
    answer:
      'Unser KI-System lernt aus deinen Swipes, Favoriten und Investment-Kriterien. Je mehr du nutzt, desto besser werden die Vorschläge - Rendite-starke Objekte passend zu deinem Profil.',
  },
  {
    question: 'Kann ich jederzeit kündigen?',
    answer:
      'Ja, du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Es gibt keine Mindestlaufzeit.',
  },
  {
    question: 'Gibt es eine Testphase?',
    answer:
      'Der Free-Plan ist dauerhaft kostenlos. Für bezahlte Pläne bieten wir eine 14-tägige Geld-zurück-Garantie.',
  },
  {
    question: 'Kann ich zwischen Plänen wechseln?',
    answer:
      'Ja, du kannst jederzeit upgraden oder downgraden. Bei einem Upgrade wird der Restbetrag anteilig verrechnet.',
  },
  {
    question: 'Welche Zahlungsmethoden werden akzeptiert?',
    answer:
      'Wir akzeptieren alle gängigen Kreditkarten, PayPal und SEPA-Lastschrift.',
  },
  {
    question: 'Gibt es Rabatte für Jahresabos?',
    answer:
      'Ja, bei jährlicher Zahlung sparst du 2 Monate. Kontaktiere uns für individuelle Enterprise-Angebote.',
  },
  {
    question: 'Was passiert mit meinen Daten bei Kündigung?',
    answer:
      'Deine Daten bleiben 30 Tage nach Kündigung erhalten. Danach werden sie gemäß DSGVO gelöscht.',
  },
];

export const verkaufFAQs = [
  {
    question: 'Wie viel spare ich gegenüber einem Makler?',
    answer:
      'Makler verlangen 3-7% Provision. Bei einer Immobilie für 300.000€ sind das 9.000-21.000€. Mit unserem Premium-Paket (249€) sparst du also bis zu 20.000€.',
  },
  {
    question: 'Wie funktioniert das Erfolgspaket?',
    answer:
      'Du zahlst nur 0,5% des Verkaufspreises - und nur bei erfolgreichem Verkauf. Bei 300.000€ sind das 1.500€ statt 9.000-21.000€ beim Makler.',
  },
  {
    question: 'Wie lange bleibt mein Inserat online?',
    answer:
      'Starter: 3 Monate, Premium: 6 Monate, Erfolgspaket: 12 Monate. Du kannst jederzeit verlängern.',
  },
  {
    question: 'Bekomme ich Hilfe bei der Preisfindung?',
    answer:
      'Ja! Im Premium- und Erfolgspaket analysiert unsere KI den Markt und gibt dir eine fundierte Preisempfehlung basierend auf vergleichbaren Objekten.',
  },
  {
    question: 'Wer übernimmt die Besichtigungen?',
    answer:
      'Du führst die Besichtigungen selbst durch. Wir stellen dir einen Leitfaden bereit. Im Erfolgspaket unterstützen wir dich bei der Terminkoordination.',
  },
  {
    question: 'Brauche ich einen Notar?',
    answer:
      'Ja, der Kaufvertrag muss notariell beurkundet werden. Im Erfolgspaket helfen wir dir bei der Notartermin-Koordination.',
  },
];

export const sucherFAQs = [
  {
    question: 'Was ist das personalisierte Feed?',
    answer:
      'Unser KI-System lernt aus deinen Swipes, Favoriten und Suchanfragen. Je mehr du nutzt, desto besser werden die Vorschläge - wie bei TikTok, nur für Immobilien.',
  },
  {
    question: 'Was ist die Budget-Suche?',
    answer:
      'Gib dein Einkommen ein und wir berechnen, was du dir leisten kannst - inklusive Kaufnebenkosten, Zinsen und Tilgung. Dann zeigen wir dir nur passende Objekte.',
  },
  {
    question: 'Was prüft der KI-Preis-Check?',
    answer:
      'Unsere KI vergleicht den Angebotspreis mit ähnlichen Objekten in der Umgebung und sagt dir, ob der Preis fair ist oder Verhandlungsspielraum besteht.',
  },
  {
    question: 'Wie funktioniert die Wohn-Lage-Bewertung?',
    answer:
      'Wir analysieren Infrastruktur, Anbindung, Einkaufsmöglichkeiten, Schulen und Freizeitangebote - alles was für das tägliche Leben wichtig ist.',
  },
  {
    question: 'Kann ich später zum Investor-Plan wechseln?',
    answer:
      'Ja! Wenn du dich entscheidest, Immobilien als Investment zu kaufen, kannst du jederzeit zum Investor-Plan upgraden und erhältst Zugang zu Rendite-Analysen.',
  },
  {
    question: 'Was kostet mich eine Immobilie wirklich?',
    answer:
      'Unser Nebenkosten-Rechner zeigt dir alle versteckten Kosten: Grunderwerbsteuer, Notar, Grundbuch, ggf. Makler - damit du keine bösen Überraschungen erlebst.',
  },
  {
    question: 'Kann ich jederzeit kündigen?',
    answer:
      'Ja, du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Es gibt keine Mindestlaufzeit.',
  },
];

export const maklerFAQs = [
  {
    question: 'Kann ich jederzeit kündigen?',
    answer:
      'Ja, du kannst dein Abo jederzeit zum Ende des Abrechnungszeitraums kündigen. Es gibt keine Mindestlaufzeit.',
  },
  {
    question: 'Wie viele Team-Mitglieder kann ich hinzufügen?',
    answer:
      'Pro ist eine Einzellizenz. Enterprise enthält 3 Seats, Agentur 10+ Seats. Weitere Seats können hinzugebucht werden.',
  },
  {
    question: 'Kann ich Objekte von anderen Portalen importieren?',
    answer:
      'Ja! Mit Pro und höher kannst du Objekte per URL, PDF-Exposé oder Screenshot importieren. Unsere KI extrahiert automatisch alle Daten.',
  },
  {
    question: 'Welche Zahlungsmethoden werden akzeptiert?',
    answer:
      'Wir akzeptieren alle gängigen Kreditkarten, PayPal und SEPA-Lastschrift. Für Agenturen bieten wir auch Rechnungskauf.',
  },
  {
    question: 'Gibt es Rabatte für Jahresabos?',
    answer:
      'Ja, bei jährlicher Zahlung sparst du 2 Monate. Kontaktiere uns für individuelle Enterprise- und Agentur-Angebote.',
  },
];
