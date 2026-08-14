CREATE TABLE public.applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  desired_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  address TEXT,
  previous_school TEXT,
  notes TEXT,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'applied',
  decision_notes TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applicants TO authenticated;
GRANT ALL ON public.applicants TO service_role;

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admissions staff manage applicants" ON public.applicants
  FOR ALL TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'receptionist')
    OR private.has_role(auth.uid(), 'hr')
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'receptionist')
    OR private.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Staff can view applicants" ON public.applicants
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'receptionist')
    OR private.has_role(auth.uid(), 'hr')
    OR private.has_role(auth.uid(), 'teacher')
    OR private.has_role(auth.uid(), 'accountant')
  );

CREATE TRIGGER set_applicants_updated_at
  BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_applicants_status ON public.applicants(status);
