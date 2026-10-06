CREATE TABLE public.school_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  location text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  audience app_role[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_events_end_after_start CHECK (end_at IS NULL OR end_at >= start_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_events TO authenticated;
GRANT ALL ON public.school_events TO service_role;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School community reads published audience events" ON public.school_events
FOR SELECT TO authenticated
USING (
  (published AND (
    cardinality(audience) = 0
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = ANY (school_events.audience)
    )
  ))
  OR created_by = auth.uid()
  OR private.has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "School staff creates events" ON public.school_events
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'teacher'::app_role)
    OR private.has_role(auth.uid(), 'hr'::app_role)
    OR private.has_role(auth.uid(), 'receptionist'::app_role)
  )
);
CREATE POLICY "Authors and admins update events" ON public.school_events
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  (created_by = auth.uid() AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'teacher'::app_role)
    OR private.has_role(auth.uid(), 'hr'::app_role)
    OR private.has_role(auth.uid(), 'receptionist'::app_role)
  ))
  OR private.has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Authors and admins delete events" ON public.school_events
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER school_events_set_updated_at
BEFORE UPDATE ON public.school_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX school_events_start_idx ON public.school_events (start_at);
CREATE INDEX school_events_published_idx ON public.school_events (published, start_at);