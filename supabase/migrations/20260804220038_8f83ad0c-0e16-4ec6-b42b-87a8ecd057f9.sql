CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  audience app_role[] NOT NULL DEFAULT '{}',
  priority text NOT NULL DEFAULT 'normal',
  pinned boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  publish_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all notices" ON public.notices
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff create notices" ON public.notices
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    private.has_role(auth.uid(), 'teacher'::app_role)
    OR private.has_role(auth.uid(), 'hr'::app_role)
    OR private.has_role(auth.uid(), 'receptionist'::app_role)
  )
);

CREATE POLICY "Authors update own notices" ON public.notices
FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authors delete own notices" ON public.notices
FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Authors read own notices" ON public.notices
FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Audience reads published notices" ON public.notices
FOR SELECT TO authenticated
USING (
  published
  AND publish_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    cardinality(audience) = 0
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = ANY (notices.audience)
    )
  )
);

CREATE TRIGGER notices_set_updated_at
BEFORE UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX notices_publish_idx ON public.notices (pinned DESC, publish_at DESC);