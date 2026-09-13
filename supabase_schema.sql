-- =====================================================================
-- FILEVAULT SUPABASE DATABASE & STORAGE SCHEMA
-- =====================================================================
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Open your project -> SQL Editor -> New query
-- 3. Paste this entire file and click "Run"
-- 4. In Supabase Dashboard -> Storage -> Create a new bucket named: "documents"
--    Set it to Private (or Public if you want direct link access).
-- =====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Synchronized with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documents Table (Vault Records + AI Multimodal Extractions)
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  sub_type TEXT,
  title TEXT,
  person_name TEXT,
  organization TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  sha256 TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  achievement TEXT,
  rank TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC DEFAULT 0,
  uncertain_fields JSONB DEFAULT '[]'::jsonb,
  verification_status TEXT DEFAULT 'Uploaded',
  processing_status TEXT DEFAULT 'uploaded',
  duplicate_status TEXT DEFAULT 'unique',
  duplicate_of_id TEXT,
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_raw_response JSONB,
  education_details JSONB,
  employment_details JSONB,
  recipient_name TEXT,
  institution TEXT,
  certificate_number TEXT,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Audit Logs Table (Full Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  document_id TEXT,
  document_name TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'SUCCESS'
);

-- 5. Shares Table (Secure Share Links)
CREATE TABLE IF NOT EXISTS public.shares (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  access_limit INTEGER,
  access_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  allowed_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications Table (In-App Alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON public.documents(sha256);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_doc ON public.shares(document_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow Service Role full access (used by server backend)
CREATE POLICY "Service role full access on users" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on documents" ON public.documents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on shares" ON public.shares FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on notifications" ON public.notifications FOR ALL TO service_role USING (true);

-- Allow authenticated users to manage their own records
CREATE POLICY "Users can read own record" ON public.users FOR SELECT TO authenticated USING (auth.uid()::text = id);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE TO authenticated USING (auth.uid()::text = id);

CREATE POLICY "Users can manage own documents" ON public.documents FOR ALL TO authenticated USING (auth.uid()::text = owner_id);
CREATE POLICY "Users can read own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can manage own shares" ON public.shares FOR ALL TO authenticated USING (auth.uid()::text = owner_id);
CREATE POLICY "Users can read own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- Setup Storage Bucket & Policy (run once bucket 'documents' is created)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own documents to bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Users can read own documents in bucket"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Users can delete own documents in bucket"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text);
