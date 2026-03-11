-- Create blog_comments table (blog post comments)
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id_created_at
ON public.blog_comments (blog_id, created_at DESC);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Anyone can view blog comments"
ON public.blog_comments
FOR SELECT
USING (true);

-- Authenticated users can comment as themselves
CREATE POLICY "Users can insert their own blog comments"
ON public.blog_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments (optional)
CREATE POLICY "Users can update their own blog comments"
ON public.blog_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own blog comments"
ON public.blog_comments
FOR DELETE
USING (auth.uid() = user_id);

