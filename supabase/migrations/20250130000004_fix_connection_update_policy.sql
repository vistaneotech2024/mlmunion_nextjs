-- Fix RLS policy to allow both owner and connector to update connection status
-- This allows users to accept/reject connection requests they receive

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Users can update their owned connections" ON classified_connections;

-- Create a new policy that allows both owner and connector to update
CREATE POLICY "Users can update their connections"
  ON classified_connections
  FOR UPDATE
  TO authenticatedConnect globally

Free sign-up, massive reach

Chat with MLM leaders

More downlines, more income

Build your trusted profile

Rank up. Get recognized

Be featured. Get noticed

Learn from the best
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = connector_id
  );

