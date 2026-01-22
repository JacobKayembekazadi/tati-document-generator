-- TATI Document Generator - Supabase Schema
-- Run this in your Supabase SQL editor to create the tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  ship_date DATE NOT NULL,
  total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_gross_weight DECIMAL(10,2) NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  products TEXT[] NOT NULL DEFAULT '{}',
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_invoice_number ON shipments(invoice_number);

-- Enable Row Level Security
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own shipments
CREATE POLICY "Users can view own shipments"
  ON shipments FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own shipments
CREATE POLICY "Users can insert own shipments"
  ON shipments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own shipments
CREATE POLICY "Users can update own shipments"
  ON shipments FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own shipments
CREATE POLICY "Users can delete own shipments"
  ON shipments FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_shipments_updated_at ON shipments;
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Customer presets table (for auto-fill)
CREATE TABLE IF NOT EXISTS customer_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  mexico_address TEXT,
  laredo_address TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  rfc TEXT,
  laredo_contact_name TEXT,
  laredo_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for customer_presets
ALTER TABLE customer_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own presets"
  ON customer_presets FOR ALL
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_customer_presets_user_id ON customer_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_presets_name ON customer_presets(customer_name);
