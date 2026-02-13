/*
  # Add Classified Connections

  1. New Tables
    - `classified_connections`
      - `id` (uuid, primary key)
      - `classified_id` (uuid, foreign key to classifieds)
      - `owner_id` (uuid, foreign key to profiles)
      - `connector_id` (uuid, foreign key to profiles)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `classified_connections` table
    - Add policies for:
      - Owners can view and update their connections
      - Connectors can view their own connections
      - Users can create new connections
*/

CREATE TABLE IF NOT EXISTS classified_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classified_id uuid REFERENCES classifieds(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  connector_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classified_connections ENABLE ROW LEVEL SECURITY;

-- Allow owners to view and update their connections
CREATE POLICY "Users can view connections they own"
  ON classified_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can update connections they own"
  ON classified_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Allow connectors to view their connections
CREATE POLICY "Users can view their own connection requests"
  ON classified_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = connector_id);

-- Allow authenticated users to create new connections
CREATE POLICY "Users can create new connections"
  ON classified_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = connector_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_classified_connections_owner
  ON classified_connections(owner_id);

CREATE INDEX IF NOT EXISTS idx_classified_connections_connector
  ON classified_connections(connector_id);

CREATE INDEX IF NOT EXISTS idx_classified_connections_classified
  ON classified_connections(classified_id);