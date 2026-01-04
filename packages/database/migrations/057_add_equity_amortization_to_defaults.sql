-- Migration 057: Add Equity and Amortization defaults
-- Adds default values for equity percentage and amortization rate to calculator_defaults

-- ============================================
-- Add new columns to calculator_defaults
-- ============================================

-- Add equity_percentage column (Standard: 20%)
ALTER TABLE calculator_defaults
  ADD COLUMN IF NOT EXISTS equity_percentage DECIMAL(5,2) NOT NULL DEFAULT 20.00;

-- Add amortization_rate column (Standard: 1%)
ALTER TABLE calculator_defaults
  ADD COLUMN IF NOT EXISTS amortization_rate DECIMAL(4,2) NOT NULL DEFAULT 1.00;

-- ============================================
-- Add validation constraints
-- ============================================

-- Equity percentage must be between 0% and 100%
ALTER TABLE calculator_defaults
  ADD CONSTRAINT chk_equity_percentage CHECK (equity_percentage >= 0 AND equity_percentage <= 100);

-- Amortization rate must be between 0% and 10%
ALTER TABLE calculator_defaults
  ADD CONSTRAINT chk_amortization_rate CHECK (amortization_rate >= 0 AND amortization_rate <= 10);

-- ============================================
-- Add comments for documentation
-- ============================================

COMMENT ON COLUMN calculator_defaults.equity_percentage IS 'Standard Eigenkapital-Prozentsatz vom Kaufpreis (Standard: 20%)';
COMMENT ON COLUMN calculator_defaults.amortization_rate IS 'Standard Tilgungssatz pro Jahr in Prozent (Standard: 1%)';

-- ============================================
-- Add columns to history table for audit trail
-- ============================================

ALTER TABLE calculator_defaults_history
  ADD COLUMN IF NOT EXISTS equity_percentage DECIMAL(5,2);

ALTER TABLE calculator_defaults_history
  ADD COLUMN IF NOT EXISTS amortization_rate DECIMAL(4,2);

-- ============================================
-- Update existing active defaults with initial values
-- ============================================

-- Set initial values for existing active record
UPDATE calculator_defaults
SET
  equity_percentage = 20.00,
  amortization_rate = 1.00
WHERE is_active = true;
