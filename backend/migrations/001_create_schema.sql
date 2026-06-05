-- AI带货视频工厂 V2.0 核心 Schema，可重复执行。
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS video;
CREATE SCHEMA IF NOT EXISTS image;
CREATE SCHEMA IF NOT EXISTS canvas;
CREATE SCHEMA IF NOT EXISTS community;
CREATE SCHEMA IF NOT EXISTS chat;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('guest','user','enterprise','admin','moderator')),
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','email_unverified','active','paying','inactive','suspended','enterprise_active')),
  credit_balance integer NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
  frozen_credits integer NOT NULL DEFAULT 0 CHECK (frozen_credits >= 0),
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.credit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  task_id text,
  record_type text NOT NULL CHECK (record_type IN ('recharge','deduct','freeze','unfreeze','refund','adjust')),
  amount integer NOT NULL,
  balance_after integer,
  description text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.credit_recharge_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  out_trade_no text NOT NULL UNIQUE,
  stripe_session_id text,
  credits integer NOT NULL CHECK (credits > 0),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'cny',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired','refunded')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  material_type text NOT NULL CHECK (material_type IN ('image','video','audio','text','document')),
  source text NOT NULL DEFAULT 'upload',
  title text NOT NULL,
  storage_key text,
  url text,
  mime_type text,
  size_bytes bigint DEFAULT 0,
  width integer,
  height integer,
  duration_seconds numeric,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','processing','blocked','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.material_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  source_material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  target_material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('input','output','derived','mentioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS video.provider_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  modality text NOT NULL CHECK (modality IN ('video','image')),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','quota_exhausted')),
  priority integer NOT NULL DEFAULT 100,
  daily_quota integer,
  used_quota integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS video.video_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  script text,
  model_id text NOT NULL,
  provider_key text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 15,
  aspect_ratio text NOT NULL DEFAULT '9:16',
  resolution text NOT NULL DEFAULT '720p',
  credit_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','succeeded','failed','cancelled')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  output_material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  output_url text,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS video.video_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  tool_key text NOT NULL,
  input_material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  params jsonb NOT NULL DEFAULT '{}',
  credit_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','succeeded','failed','cancelled')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  output_material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  output_url text,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS image.image_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  model_id text NOT NULL,
  provider_key text NOT NULL,
  aspect_ratio text NOT NULL DEFAULT '1:1',
  resolution text NOT NULL DEFAULT '1024',
  image_format text NOT NULL DEFAULT 'png',
  credit_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','succeeded','failed','cancelled')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  output_material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  output_url text,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS canvas.canvases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1920,
  background_color text NOT NULL DEFAULT '#ffffff',
  thumbnail_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS canvas.canvas_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  canvas_id uuid REFERENCES canvas.canvases(id) ON DELETE CASCADE,
  element_type text NOT NULL CHECK (element_type IN ('image','text','rect','circle','line')),
  z_index integer NOT NULL DEFAULT 0,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 100,
  height numeric NOT NULL DEFAULT 100,
  rotation numeric NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  props jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS community.community_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  canvas_id uuid REFERENCES canvas.canvases(id) ON DELETE SET NULL,
  work_type text NOT NULL CHECK (work_type IN ('video','image','canvas')),
  title text NOT NULL,
  description text,
  cover_url text,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','published','rejected','taken_down')),
  like_count integer NOT NULL DEFAULT 0,
  bookmark_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS community.community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  work_id uuid REFERENCES community.community_works(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (user_id, work_id)
);

CREATE TABLE IF NOT EXISTS community.community_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  work_id uuid REFERENCES community.community_works(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (user_id, work_id)
);

CREATE TABLE IF NOT EXISTS chat.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '新对话',
  skill_key text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS chat.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES chat.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_users_status_created ON public.users(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_records_user ON public.credit_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_user ON public.materials(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_materials_type_status ON public.materials(material_type, status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_user ON video.video_generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video.video_generation_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_jobs_user ON video.video_processing_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_jobs_user ON image.image_generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_jobs_status ON image.image_generation_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvases_user ON canvas.canvases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_elements_canvas ON canvas.canvas_elements(canvas_id, z_index);
CREATE INDEX IF NOT EXISTS idx_works_status_created ON community.community_works(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_user ON community.community_works(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON chat.conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat.conversation_messages(conversation_id, created_at);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.users','public.api_keys','public.credit_records','public.credit_recharge_orders',
    'public.materials','public.material_references','public.audit_logs',
    'video.provider_accounts','video.video_generation_jobs','video.video_processing_jobs',
    'image.image_generation_jobs','canvas.canvases','canvas.canvas_elements',
    'community.community_works','community.community_likes','community.community_bookmarks',
    'chat.conversations','chat.conversation_messages'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON %s', table_name);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', table_name);
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;
