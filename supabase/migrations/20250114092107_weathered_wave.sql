/*
  # MLM Companies Schema

  1. New Tables
    - `mlm_companies`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, required)
      - `category` (text, required)
      - `country` (text, required)
      - `headquarters` (text, required)
      - `website` (text, required)
      - `established` (integer, required)
      - `logo_url` (text, required)
      - `status` (text, default: 'pending')
      - `submitted_by` (uuid, references profiles)
      - `created_at` (timestamp)
      - `approved_at` (timestamp)

  2. Security
    - Enable RLS on `mlm_companies` table
    - Add policies for:
      - Public viewing of approved companies
      - Authenticated users can submit new companies
      - Users can view their own submitted companies
      - Admins can manage all companies
*/

-- Create MLM companies table
CREATE TABLE mlm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  country text NOT NULL,
  headquarters text NOT NULL,
  website text NOT NULL,
  established integer NOT NULL,
  logo_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz
);

-- Enable RLS
ALTER TABLE mlm_companies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved companies"
  ON mlm_companies
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authenticated users can submit companies"
  ON mlm_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view their submitted companies"
  ON mlm_companies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by);

-- Create indexes for better performance
CREATE INDEX idx_mlm_companies_status ON mlm_companies(status);
CREATE INDEX idx_mlm_companies_category ON mlm_companies(category);
CREATE INDEX idx_mlm_companies_country ON mlm_companies(country);