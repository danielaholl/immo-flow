-- Migration 050: Vereinfache Seller Knowledge zu einfachem Textfeld
-- Statt mehrerer Einträge mit Kategorien -> ein Freitext-Feld pro Property

-- Neue Spalte in properties Tabelle
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS seller_notes TEXT DEFAULT '';

-- Bestehende Einträge migrieren (zusammenfassen)
UPDATE properties p
SET seller_notes = (
  SELECT STRING_AGG(
    topic || ': ' || content,
    E'\n\n'
    ORDER BY created_at
  )
  FROM seller_knowledge_base skb
  WHERE skb.property_id = p.id
    AND skb.is_active = true
)
WHERE EXISTS (
  SELECT 1 FROM seller_knowledge_base WHERE property_id = p.id
);

-- Alte Tabelle bleibt als Backup bestehen (später löschen wenn alles funktioniert)
-- DROP TABLE IF EXISTS seller_knowledge_base;
