-- =================================================================
-- FileVault Supabase PostgreSQL Database Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents Table
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
  ai_processed BOOLEAN DEFAULT false,
  ai_raw_response TEXT,
  education_details JSONB,
  employment_details JSONB,
  recipient_name TEXT,
  institution TEXT,
  certificate_number TEXT,
  description TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT false,
  pinned_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON public.documents(sha256);

-- 3. Share Links Table
CREATE TABLE IF NOT EXISTS public.shares (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  access_limit INT,
  access_count INT DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  allowed_fields JSONB DEFAULT '["documentType","institution","recipientName","issueDate","expiryDate","certificateNumber"]'::jsonb,
  permission TEXT DEFAULT 'both',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shares_document_id ON public.shares(document_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner_id ON public.shares(owner_id);

-- 4. Audit Trail Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  document_id TEXT,
  document_name TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'SUCCESS',
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 5. Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full read/write access
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;
CREATE POLICY "Service role full access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to documents" ON public.documents;
CREATE POLICY "Service role full access to documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to shares" ON public.shares;
CREATE POLICY "Service role full access to shares" ON public.shares FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
