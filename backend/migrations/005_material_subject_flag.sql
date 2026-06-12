-- Mark reusable subject materials for homepage @ selection and generator context.

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS is_subject boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_materials_subject_user
  ON public.materials(user_id, is_subject, created_at DESC)
  WHERE deleted_at IS NULL;
