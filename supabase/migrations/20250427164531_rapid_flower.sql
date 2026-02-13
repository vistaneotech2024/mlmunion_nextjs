/*
  # Add Top Earners Table

  1. New Table
    - `top_earners` - Stores information about top MLM earners
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `image_url` (text, required)
      - `company` (text, required)
      - `country` (text, required)
      - `monthly_income` (integer, required)
      - `annual_income` (integer, required)
      - `rank` (integer, required)
      - `bio` (text, required)
      - `slug` (text, unique)
      - `story` (text)
      - `achievements` (text[])
      - `started_year` (integer)
      - `social_media` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `top_earners` table
    - Add policies for:
      - Public viewing of top earners
      - Admin management of top earners
*/

-- Create top_earners table
CREATE TABLE IF NOT EXISTS top_earners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  company text NOT NULL,
  country text NOT NULL,
  monthly_income integer NOT NULL,
  annual_income integer NOT NULL,
  rank integer NOT NULL,
  bio text NOT NULL,
  slug text UNIQUE,
  story text,
  achievements text[],
  started_year integer,
  social_media jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE top_earners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view top earners"
  ON top_earners FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage top earners"
  ON top_earners FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_top_earners_modtime
  BEFORE UPDATE ON top_earners
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- Create function to get top earners
CREATE OR REPLACE FUNCTION get_top_earners(
  country_filter text DEFAULT NULL,
  company_filter text DEFAULT NULL,
  limit_count integer DEFAULT 100
)
RETURNS SETOF top_earners
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM top_earners
  WHERE (country_filter IS NULL OR country = country_filter)
  AND (company_filter IS NULL OR company = company_filter)
  ORDER BY rank ASC
  LIMIT limit_count;
END;
$$;

-- Create function to get top earner by slug
CREATE OR REPLACE FUNCTION get_top_earner_by_slug(earner_slug text)
RETURNS SETOF top_earners
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM top_earners
  WHERE slug = earner_slug;
END;
$$;

-- Add slug trigger to generate slugs for top earners
CREATE TRIGGER top_earners_slug_trigger
  BEFORE INSERT OR UPDATE
  ON top_earners
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_trigger();

-- Insert sample data
INSERT INTO top_earners (name, image_url, company, country, monthly_income, annual_income, rank, bio, slug, story, achievements, started_year)
VALUES 
  (
    'Ada Caballero',
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'Vida Divina',
    'US',
    1200000,
    14400000,
    1,
    'Ada Caballero is a top earner at Vida Divina, with over 15 years of experience in network marketing. She has built a team of over 100,000 distributors worldwide.',
    'ada-caballero',
    'Ada Caballero''s journey in network marketing began in 2005 when she was struggling to make ends meet as a single mother of three. Working two jobs and barely seeing her children, she knew there had to be a better way. When a friend introduced her to network marketing, she was initially skeptical but decided to give it a try. Starting with just a few hours a week, Ada quickly discovered she had a natural talent for building relationships and helping others succeed. By 2010, she had built a team of over 10,000 distributors and was earning a six-figure income. Her breakthrough came in 2015 when she joined Vida Divina and applied her years of experience to build an international organization. Today, Ada leads one of the largest teams in the company with over 100,000 distributors across 30 countries. She is known for her servant leadership style and commitment to helping others achieve financial freedom.',
    ARRAY['Built a team of over 100,000 distributors worldwide', 'Highest earner in Vida Divina history', 'Author of "Network Marketing Mastery"', 'Featured in Direct Selling News', 'Philanthropist who has built schools in 5 countries'],
    2005
  ),
  (
    'Jenna Zwagil',
    'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'MyDailyChoice',
    'US',
    1060000,
    12720000,
    2,
    'Jenna Zwagil is the co-founder of MyDailyChoice and has been in the network marketing industry for over a decade. Her leadership has inspired thousands.',
    'jenna-zwagil',
    'Jenna Zwagil''s story is one of perseverance and vision. Before co-founding MyDailyChoice, Jenna had already established herself as a top performer in several network marketing companies. Her journey began when she was just 22 years old, working a corporate job that left her feeling unfulfilled. After being introduced to network marketing, she quickly recognized the potential for time freedom and unlimited income. What sets Jenna apart is her innovative approach to team building and her early adoption of social media marketing strategies. When many in the industry were still focused on home parties and cold calling, Jenna was building massive teams through Facebook and Instagram. In 2014, together with her husband Josh, she co-founded MyDailyChoice with a vision to create a company that truly puts distributors first.',
    ARRAY['Co-founder of MyDailyChoice', 'Built an organization of over 80,000 distributors', 'Pioneered social media marketing strategies in MLM', 'Featured speaker at over 100 international events', 'Created the "Network Marketing Millionaire" training system'],
    2008
  ),
  (
    'Sandro Cazzato',
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'Chogan',
    'IT',
    707000,
    8484000,
    3,
    'Sandro Cazzato has built one of the largest teams in Chogan, focusing on the European market. His business strategies have revolutionized the industry.',
    'sandro-cazzato',
    'Sandro Cazzato''s rise to the top of Chogan is a testament to his innovative approach to network marketing in the European market. Born in a small town in southern Italy, Sandro initially pursued a career in finance before discovering network marketing in 2009. What makes Sandro''s story unique is how he transformed traditional network marketing approaches to suit the European mindset. Understanding that Europeans often have a different perspective on direct selling than Americans, he developed a system that emphasized product quality and long-term customer relationships over aggressive recruitment.',
    ARRAY['Built Chogan''s largest international organization', 'Developed the "European Method" training system', 'First network marketer to reach €1 million monthly in Europe', 'Author of "La Vendita Relazionale" (Relationship Selling)', 'Mentor to over 50 six-figure earners'],
    2009
  )
ON CONFLICT (slug) DO NOTHING;