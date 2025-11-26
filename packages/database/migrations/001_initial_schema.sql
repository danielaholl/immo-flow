-- ImmoFlow Database Schema
-- Version: 001 - Initial Schema
-- Description: Core tables for properties, agents, bookings, and favorites

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- AGENTS TABLE
-- =====================================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company TEXT,
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents indexes
CREATE INDEX agents_user_id_idx ON agents(user_id);
CREATE INDEX agents_email_idx ON agents(email);

-- =====================================================
-- PROPERTIES TABLE
-- =====================================================
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  address TEXT,

  -- Pricing
  price INTEGER NOT NULL CHECK (price > 0),
  monthly_rent INTEGER CHECK (monthly_rent >= 0),

  -- Details
  sqm INTEGER NOT NULL CHECK (sqm > 0),
  rooms INTEGER NOT NULL CHECK (rooms > 0),

  -- Features
  features TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',

  -- AI Analysis
  highlights TEXT[] DEFAULT '{}',
  red_flags TEXT[] DEFAULT '{}',
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),

  -- Investment metrics
  yield DECIMAL(4,2) CHECK (yield >= 0),

  -- Additional info
  energy_class TEXT,
  available_from DATE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'archived')),

  -- Metrics
  views INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties indexes
CREATE INDEX properties_location_idx ON properties(location);
CREATE INDEX properties_price_idx ON properties(price);
CREATE INDEX properties_agent_id_idx ON properties(agent_id);
CREATE INDEX properties_status_idx ON properties(status);
CREATE INDEX properties_created_at_idx ON properties(created_at DESC);
CREATE INDEX properties_ai_score_idx ON properties(ai_score DESC);

-- =====================================================
-- BOOKINGS TABLE
-- =====================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Booking details
  date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique booking per property and time slot
  UNIQUE(property_id, date)
);

-- Bookings indexes
CREATE INDEX bookings_property_id_idx ON bookings(property_id);
CREATE INDEX bookings_user_id_idx ON bookings(user_id);
CREATE INDEX bookings_date_idx ON bookings(date);
CREATE INDEX bookings_status_idx ON bookings(status);

-- =====================================================
-- FAVORITES TABLE
-- =====================================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique favorite per user and property
  UNIQUE(property_id, user_id)
);

-- Favorites indexes
CREATE INDEX favorites_property_id_idx ON favorites(property_id);
CREATE INDEX favorites_user_id_idx ON favorites(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- AGENTS POLICIES
CREATE POLICY "Anyone can view agents"
  ON agents FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage their own agent profile"
  ON agents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PROPERTIES POLICIES
CREATE POLICY "Anyone can view active properties"
  ON properties FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Agents can view all their properties"
  ON properties FOR SELECT
  TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update their own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "Agents can delete their own properties"
  ON properties FOR DELETE
  TO authenticated
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- BOOKINGS POLICIES
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR
         property_id IN (
           SELECT id FROM properties WHERE agent_id IN (
             SELECT id FROM agents WHERE user_id = auth.uid()
           )
         ));

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can update bookings for their properties"
  ON bookings FOR UPDATE
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  ));

-- FAVORITES POLICIES
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own favorites"
  ON favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agents table
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for properties table
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment property views
CREATE OR REPLACE FUNCTION increment_property_views(property_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE properties
  SET views = views + 1
  WHERE id = property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update favorites count
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE properties
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.property_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE properties
    SET favorites_count = favorites_count - 1
    WHERE id = OLD.property_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update favorites count
CREATE TRIGGER update_property_favorites_count
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_favorites_count();

-- =====================================================
-- SAMPLE DATA (for development)
-- =====================================================

-- Insert sample agent (you can remove this in production)
-- INSERT INTO agents (name, email, company, rating) VALUES
--   ('Max Mustermann', 'max@immoflow.de', 'ImmoFlow GmbH', 4.8);

-- Note: Add sample properties after setting up authentication
