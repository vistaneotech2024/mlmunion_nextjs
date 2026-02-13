-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  active boolean DEFAULT true,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active FAQs"
ON faqs FOR SELECT
USING (active = true);

CREATE POLICY "Admins can view all FAQs"
ON faqs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "Only admins can manage FAQs"
ON faqs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Add some initial FAQs
INSERT INTO faqs (question, answer, category, "order")
VALUES 
  (
    'What is MLM Union?',
    'MLM Union is a platform that connects network marketers with legitimate MLM companies and provides resources for success in the network marketing industry.',
    'General',
    0
  ),
  (
    'How do I verify my direct seller account?',
    'To verify your account, complete your profile with accurate information and submit the necessary documentation. Our team will review and verify your account within 48 hours.',
    'Account',
    1
  ),
  (
    'How can I list my MLM company?',
    'You can submit your MLM company by clicking on the "Add New Company" button on the Companies page. Fill out the required information and our team will review your submission.',
    'Companies',
    2
  )
ON CONFLICT DO NOTHING;