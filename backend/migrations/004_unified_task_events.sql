-- Unified task and material usage events for dashboards, audit and reuse analytics.

CREATE TABLE IF NOT EXISTS public.task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL CHECK (task_type IN ('video','image','tool')),
  task_id uuid NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.material_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events(task_type, task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_event ON public.task_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_usage_material ON public.material_usage_events(material_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_usage_user ON public.material_usage_events(user_id, created_at DESC);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.task_events',
    'public.material_usage_events'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON %s', table_name);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', table_name);
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;
