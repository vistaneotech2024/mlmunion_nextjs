-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view connections they own" ON classified_connections;
DROP POLICY IF EXISTS "Users can update connections they own" ON classified_connections;
DROP POLICY IF EXISTS "Users can view their own connection requests" ON classified_connections;
DROP POLICY IF EXISTS "Users can create new connections" ON classified_connections;

-- Update the queries to use proper joins
CREATE POLICY "Users can view all their connections"
  ON classified_connections
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = connector_id
  );

CREATE POLICY "Users can update their owned connections"
  ON classified_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create new connections"
  ON classified_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = connector_id);