-- Submission history: snapshot of what was filled per company
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,

    page_url TEXT NOT NULL,
    page_title TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),

    -- Snapshot: [{field_label, category, filled_content, char_count}]
    fields_snapshot JSONB NOT NULL DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_submissions_user ON public.submissions(user_id);
CREATE INDEX idx_submissions_company ON public.submissions(company_id);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own submissions"
    ON public.submissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
    ON public.submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own submissions"
    ON public.submissions FOR DELETE
    USING (auth.uid() = user_id);
