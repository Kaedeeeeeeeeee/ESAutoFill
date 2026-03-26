-- Change encrypted PII columns from BYTEA to TEXT for easier hex string storage
ALTER TABLE public.profiles ALTER COLUMN full_name_enc TYPE TEXT USING encode(full_name_enc, 'hex');
ALTER TABLE public.profiles ALTER COLUMN furigana_enc TYPE TEXT USING encode(furigana_enc, 'hex');
ALTER TABLE public.profiles ALTER COLUMN email_enc TYPE TEXT USING encode(email_enc, 'hex');
ALTER TABLE public.profiles ALTER COLUMN phone_enc TYPE TEXT USING encode(phone_enc, 'hex');
