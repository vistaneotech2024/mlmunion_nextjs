-- Add remark column to classified_connections
ALTER TABLE classified_connections
ADD COLUMN IF NOT EXISTS remark text;

-- Create messages table for chat
CREATE TABLE IF NOT EXISTS connection_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES classified_connections(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE connection_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to view messages for their connections
CREATE POLICY "Users can view messages for their connections"
  ON connection_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classified_connections
      WHERE id = connection_messages.connection_id
      AND (owner_id = auth.uid() OR connector_id = auth.uid())
      AND status = 'accepted'
    )
  );

-- Allow users to send messages for their accepted connections
CREATE POLICY "Users can send messages for accepted connections"
  ON connection_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classified_connections
      WHERE id = connection_messages.connection_id
      AND (owner_id = auth.uid() OR connector_id = auth.uid())
      AND status = 'accepted'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_connection_messages_connection
  ON connection_messages(connection_id);

CREATE INDEX IF NOT EXISTS idx_connection_messages_sender
  ON connection_messages(sender_id);