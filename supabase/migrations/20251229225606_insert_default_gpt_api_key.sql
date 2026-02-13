/*
  # Insert Default GPT API Key
  
  This migration inserts a GPT API key into the api_keys table.
  Replace 'YOUR_OPENAI_API_KEY_HERE' with your actual OpenAI API key.
  Replace 'gpt-4' with your preferred model (e.g., 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', etc.)
  
  To use this:
  1. Replace YOUR_OPENAI_API_KEY_HERE with your actual API key from https://platform.openai.com/api-keys
  2. Adjust the model name if needed
  3. Set is_active = true if you want it to be the active key immediately
  4. Optionally add a name to identify the key
*/

-- Insert GPT API key (replace the values with your actual credentials)
INSERT INTO api_keys (provider, model, api_key, is_active, name)
VALUES (
  'gpt',                                    -- provider
  'gpt-4',                                  -- model (options: gpt-4, gpt-4-turbo, gpt-4o, gpt-3.5-turbo, gpt-3.5-turbo-16k)
  'YOUR_OPENAI_API_KEY_HERE',              -- Replace with your actual OpenAI API key
  true,                                     -- Set to true to mark as active
  'Default GPT-4 Key'                       -- Optional: Name to identify this key
)
ON CONFLICT DO NOTHING;

-- Alternative: If you want to insert via SQL editor directly (without migration)
-- Just run this query in Supabase SQL Editor after replacing the values:

/*
INSERT INTO api_keys (provider, model, api_key, is_active, name)
VALUES (
  'gpt',
  'gpt-4',
  'YOUR_OPENAI_API_KEY_HERE',
  true,
  'Production GPT-4 Key'
);
*/

