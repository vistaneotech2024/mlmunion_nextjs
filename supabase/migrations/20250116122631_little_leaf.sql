-- Add initial content for privacy policy and terms of service
INSERT INTO page_content (page, content)
VALUES 
  ('privacy',
   '<h2>Privacy Policy</h2>
    <p>Last updated: January 16, 2025</p>
    <p>This Privacy Policy describes how MLM Union ("we," "us," or "our") collects, uses, and discloses your personal information when you use our website and services.</p>
    <h3>Information We Collect</h3>
    <ul>
      <li>Personal information (name, email address, phone number)</li>
      <li>Profile information</li>
      <li>Usage data and analytics</li>
      <li>Communication records</li>
    </ul>
    <h3>How We Use Your Information</h3>
    <ul>
      <li>To provide and maintain our services</li>
      <li>To notify you about changes to our services</li>
      <li>To provide customer support</li>
      <li>To gather analysis or valuable information to improve our services</li>
    </ul>
    <h3>Information Security</h3>
    <p>We implement appropriate security measures to protect your personal information.</p>'),
  ('terms',
   '<h2>Terms of Service</h2>
    <p>Last updated: January 16, 2025</p>
    <p>Please read these Terms of Service carefully before using MLM Union.</p>
    <h3>Acceptance of Terms</h3>
    <p>By accessing or using our service, you agree to be bound by these Terms.</p>
    <h3>User Responsibilities</h3>
    <ul>
      <li>Provide accurate information</li>
      <li>Maintain the security of your account</li>
      <li>Comply with all applicable laws and regulations</li>
      <li>Respect other users and their rights</li>
    </ul>
    <h3>Prohibited Activities</h3>
    <ul>
      <li>Fraudulent or misleading activities</li>
      <li>Unauthorized access to other users accounts</li>
      <li>Spamming or harassment</li>
      <li>Distribution of malware or harmful content</li>
    </ul>')
ON CONFLICT (page) DO NOTHING;