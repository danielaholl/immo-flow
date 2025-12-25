-- =====================================================
-- SELLER KNOWLEDGE BASE
-- =====================================================
-- Private Wissensbasis fuer Verkaeufer pro Property
-- Wird von der KI als Kontext verwendet und durch Chat-Antworten erweitert

-- Haupttabelle fuer Seller Knowledge
CREATE TABLE IF NOT EXISTS seller_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Wissenseintrag
  topic VARCHAR(255) NOT NULL,           -- z.B. "Tiefgaragensanierung", "Sonderumlage"
  content TEXT NOT NULL,                  -- Der eigentliche Wissensinhalt

  -- Metadaten zur Quelle
  source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'chat_learned')),
  source_message_id UUID,                 -- Referenz zur Chat-Nachricht (falls chat_learned)

  -- Kategorisierung
  category VARCHAR(100) CHECK (category IN ('costs', 'renovation', 'legal', 'technical', 'neighborhood', 'amenities', 'other')),

  -- Status
  is_active BOOLEAN DEFAULT true,         -- Kann deaktiviert werden ohne Loeschung
  confidence_score NUMERIC(3,2),          -- Bei AI-extrahierten Eintraegen: Confidence (0.00-1.00)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ein Eintrag ist eindeutig pro Property + Topic (um Duplikate zu vermeiden)
  UNIQUE(property_id, topic)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Schnelle Suche nach Property
CREATE INDEX IF NOT EXISTS idx_seller_knowledge_property
  ON seller_knowledge_base(property_id);

-- Schnelle Suche nach User
CREATE INDEX IF NOT EXISTS idx_seller_knowledge_user
  ON seller_knowledge_base(user_id);

-- Nur aktive Eintraege filtern
CREATE INDEX IF NOT EXISTS idx_seller_knowledge_active
  ON seller_knowledge_base(property_id, is_active)
  WHERE is_active = true;

-- Kategorie-Filter
CREATE INDEX IF NOT EXISTS idx_seller_knowledge_category
  ON seller_knowledge_base(category);

-- Volltext-Suche auf topic und content
CREATE INDEX IF NOT EXISTS idx_seller_knowledge_search
  ON seller_knowledge_base
  USING gin(to_tsvector('german', topic || ' ' || content));

-- =====================================================
-- TRIGGER
-- =====================================================

-- Automatische Aktualisierung von updated_at
CREATE OR REPLACE FUNCTION update_seller_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_seller_knowledge_updated_at ON seller_knowledge_base;
CREATE TRIGGER trigger_seller_knowledge_updated_at
  BEFORE UPDATE ON seller_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_knowledge_updated_at();

-- =====================================================
-- KOMMENTARE
-- =====================================================

COMMENT ON TABLE seller_knowledge_base IS
  'Private Wissensbasis fuer Verkaeufer - wird als Kontext fuer KI-Chat verwendet und automatisch durch Chat-Antworten erweitert';

COMMENT ON COLUMN seller_knowledge_base.topic IS
  'Kurzer Titel/Thema des Wissenseintrags (max 255 Zeichen)';

COMMENT ON COLUMN seller_knowledge_base.content IS
  'Detaillierter Inhalt des Wissenseintrags';

COMMENT ON COLUMN seller_knowledge_base.source_type IS
  'Quelle des Eintrags: manual = vom Verkaeufer manuell erstellt, chat_learned = automatisch aus Chat-Antwort gelernt';

COMMENT ON COLUMN seller_knowledge_base.confidence_score IS
  'Bei chat_learned: Confidence-Score der KI-Extraktion (0.00-1.00)';
