/*
  # Add Messages Page Content

  1. Changes
    - Add default content for messages page
    - Ensure page is published and accessible
*/

-- Insert messages page content if it doesn't exist
INSERT INTO page_content (page, title, content, slug, is_published)
VALUES 
  ('messages',
   'Messages',
   '<h2>Messages</h2>
    <p>Welcome to your messages center. Here you can view and manage all your communications with other members of the MLM Union community.</p>
    <h3>How It Works</h3>
    <ul>
      <li>Connect with other members through the Direct Sellers directory</li>
      <li>Send and receive messages about business opportunities</li>
      <li>Build your network and grow your business</li>
    </ul>
    <p>To get started, browse our <a href="/direct-sellers">Direct Sellers directory</a> and connect with members who share your interests.</p>',
   'messages',
   true)
ON CONFLICT (page) DO UPDATE
SET 
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = EXCLUDED.is_published;