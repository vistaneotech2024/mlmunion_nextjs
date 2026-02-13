-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Create function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message)
  VALUES (p_user_id, p_title, p_message);
END;
$$;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id uuid,
  p_notification_ids uuid[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = p_user_id
  AND (p_notification_ids IS NULL OR id = ANY(p_notification_ids))
  AND read = false;
END;
$$;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM notifications
  WHERE user_id = p_user_id
  AND read = false;
$$;

-- Create classified_contacts table
CREATE TABLE IF NOT EXISTS classified_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classified_id uuid REFERENCES classifieds(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE classified_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for classified_contacts
CREATE POLICY "Users can view their own contacts"
ON classified_contacts FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create contacts"
ON classified_contacts FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Create trigger function to create notifications for classified contacts
CREATE OR REPLACE FUNCTION notify_classified_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  classified_title text;
  sender_name text;
BEGIN
  -- Get the classified title and sender name
  SELECT title INTO classified_title
  FROM classifieds
  WHERE id = NEW.classified_id;

  SELECT username INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification
  PERFORM create_notification(
    NEW.recipient_id,
    'New Contact Request',
    'You have a new contact request from ' || sender_name || ' regarding your classified: ' || classified_title
  );

  RETURN NEW;
END;
$$;

-- Create trigger for classified contacts
CREATE TRIGGER notify_classified_contact_trigger
  AFTER INSERT ON classified_contacts
  FOR EACH ROW
  EXECUTE FUNCTION notify_classified_contact();