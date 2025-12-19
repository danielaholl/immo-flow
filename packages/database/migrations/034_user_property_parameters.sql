-- =====================================================
-- USER PROPERTY PARAMETERS
-- =====================================================
-- Speichert benutzerspezifische Berechnungsparameter pro Property
-- für individuelle Rendite/Cashflow-Kalkulationen

CREATE TABLE IF NOT EXISTS user_property_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Finanzierungsparameter
  equity_percentage NUMERIC(5,2),        -- Eigenkapital in % (z.B. 20.00)
  interest_rate NUMERIC(5,2),            -- Zinssatz in % (z.B. 3.75)
  amortization_rate NUMERIC(5,2),        -- Tilgung in % (z.B. 2.00)
  broker_commission NUMERIC(5,2),        -- Maklergebühren in % (z.B. 3.57)

  -- Einnahmen/Ausgaben
  monthly_rent NUMERIC(10,2),            -- Mieteinnahmen pro Monat in EUR
  monthly_fee NUMERIC(10,2),             -- Hausgeld pro Monat in EUR

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Eindeutigkeit: Ein Eintrag pro User pro Property
  UNIQUE(user_id, property_id)
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_user_property_params_user ON user_property_parameters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_property_params_property ON user_property_parameters(property_id);

-- Kommentar
COMMENT ON TABLE user_property_parameters IS 'Benutzerspezifische Berechnungsparameter für Immobilien-Kennzahlen';
