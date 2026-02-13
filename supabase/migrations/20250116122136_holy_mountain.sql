-- Create page_content table
CREATE TABLE IF NOT EXISTS page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL UNIQUE,
  content text NOT NULL,
  last_updated timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Create policies for page_content
CREATE POLICY "Anyone can view page content"
ON page_content FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage page content"
ON page_content FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for contact_messages
CREATE POLICY "Anyone can create contact messages"
ON contact_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view contact messages"
ON contact_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "Only admins can update contact messages"
ON contact_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "Only admins can delete contact messages"
ON contact_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

-- Add initial about page content
INSERT INTO page_content (page, content)
VALUES (
  'about',
  '<h2>Welcome to MLM Union</h2>
   <p>MLM Union is your trusted platform for network marketing opportunities in India and worldwide. We connect direct sellers with legitimate MLM companies and provide resources for success in the network marketing industry.</p>
   <h3>Our Mission</h3>
   <p>To create a transparent and trustworthy ecosystem for network marketing professionals, helping them build successful businesses through verified opportunities and valuable connections.</p>
   <h3>What We Offer</h3>
   <ul>
     <li>Verified MLM Company Directory</li>
     <li>Direct Seller Network</li>
     <li>Business Opportunities</li>
     <li>Industry Insights and Resources</li>
     <li>Professional Networking</li>
   </ul>
   <h3>Why Choose Us</h3>
   <p>We verify all companies and sellers on our platform to ensure legitimacy and protect our community from fraudulent schemes. Our rating system and user reviews help you make informed decisions about business opportunities.</p>'
) ON CONFLICT (page) DO NOTHING;