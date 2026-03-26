-- Company records with research data and 選考 tracking
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    company_name TEXT NOT NULL,
    company_url TEXT,
    industry TEXT,

    -- Auto-collected research data (P2)
    mission_statement TEXT,
    recent_news JSONB DEFAULT '[]',
    business_areas TEXT[] DEFAULT '{}',
    company_values TEXT[] DEFAULT '{}',

    -- 志望動機
    user_keywords TEXT[] DEFAULT '{}',
    shiboudouki TEXT,
    shiboudouki_variants JSONB DEFAULT '{}',

    senkou_status TEXT DEFAULT '未応募' CHECK (senkou_status IN (
        '未応募', 'ES提出済', '一次面接', '二次面接', '最終面接', '内定', '不合格', '辞退'
    )),

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_user ON public.companies(user_id);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own companies"
    ON public.companies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies"
    ON public.companies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
    ON public.companies FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
    ON public.companies FOR DELETE
    USING (auth.uid() = user_id);
