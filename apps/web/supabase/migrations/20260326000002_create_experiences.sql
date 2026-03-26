-- STAR-structured experiences, reusable across ES fields
CREATE TABLE public.experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    category TEXT NOT NULL CHECK (category IN (
        'gakuchika', 'leadership', 'teamwork', 'challenge',
        'failure', 'strength_evidence', 'part_time', 'club',
        'research', 'volunteer', 'internship', 'other'
    )),
    title TEXT NOT NULL,

    -- STAR structure
    situation TEXT NOT NULL,
    task TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL,

    learnings TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Pre-generated length variants: {"200": "text...", "400": "text..."}
    variants JSONB DEFAULT '{}',

    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_experiences_user ON public.experiences(user_id);
CREATE INDEX idx_experiences_category ON public.experiences(category);
CREATE INDEX idx_experiences_tags ON public.experiences USING GIN(tags);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own experiences"
    ON public.experiences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own experiences"
    ON public.experiences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiences"
    ON public.experiences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences"
    ON public.experiences FOR DELETE
    USING (auth.uid() = user_id);
