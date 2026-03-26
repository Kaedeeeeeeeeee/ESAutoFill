-- File upload tracking
CREATE TABLE public.file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
    storage_path TEXT NOT NULL,
    parsed_text TEXT,
    parsed_structured JSONB,

    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'parsing', 'parsed', 'error')),
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_file_uploads_user ON public.file_uploads(user_id);

ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own uploads"
    ON public.file_uploads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
    ON public.file_uploads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
    ON public.file_uploads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads"
    ON public.file_uploads FOR DELETE
    USING (auth.uid() = user_id);
