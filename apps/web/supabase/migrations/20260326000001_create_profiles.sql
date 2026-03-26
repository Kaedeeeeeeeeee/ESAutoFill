-- User profiles: core personal data for ES filling
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info (PII encrypted at application level)
    full_name_enc BYTEA,
    furigana_enc BYTEA,
    email_enc BYTEA,
    phone_enc BYTEA,

    -- Non-sensitive academic info
    university TEXT,
    faculty TEXT,
    department TEXT,
    graduation_year INT,

    -- Structured summary fields
    strengths JSONB DEFAULT '[]',
    weaknesses JSONB DEFAULT '[]',
    career_goals JSONB DEFAULT '{}',
    self_pr TEXT,
    gakuchika TEXT,

    raw_upload_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = user_id);
