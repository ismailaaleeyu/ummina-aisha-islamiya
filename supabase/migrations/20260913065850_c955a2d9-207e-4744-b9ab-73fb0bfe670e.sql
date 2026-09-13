CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  instructions TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  max_score NUMERIC NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage assignments"
ON public.assignments FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  OR private.has_role(auth.uid(), 'teacher')
  OR private.has_role(auth.uid(), 'hr')
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  OR private.has_role(auth.uid(), 'teacher')
  OR private.has_role(auth.uid(), 'hr')
);

CREATE POLICY "Read-only roles view assignments"
ON public.assignments FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'accountant')
  OR private.has_role(auth.uid(), 'librarian')
  OR private.has_role(auth.uid(), 'receptionist')
  OR private.has_role(auth.uid(), 'transport_manager')
);

CREATE POLICY "Students view own class assignments"
ON public.assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid() AND s.class_id = assignments.class_id
  )
);

CREATE POLICY "Parents view children class assignments"
ON public.assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_user_id = auth.uid() AND s.class_id = assignments.class_id
  )
);

CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  content TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','late','graded')),
  score NUMERIC,
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
GRANT SELECT ON public.assignment_submissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage submissions"
ON public.assignment_submissions FOR ALL TO authenticated
USING (
  private.has_role(auth.uid(), 'admin')
  OR private.has_role(auth.uid(), 'teacher')
  OR private.has_role(auth.uid(), 'hr')
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin')
  OR private.has_role(auth.uid(), 'teacher')
  OR private.has_role(auth.uid(), 'hr')
);

CREATE POLICY "Students manage own submission"
ON public.assignment_submissions FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = assignment_submissions.student_id AND s.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = assignment_submissions.student_id AND s.user_id = auth.uid())
);

CREATE POLICY "Parents view children submissions"
ON public.assignment_submissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.parent_user_id = auth.uid() AND psl.student_id = assignment_submissions.student_id
  )
);

CREATE POLICY "Read-only roles view submissions"
ON public.assignment_submissions FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'accountant')
  OR private.has_role(auth.uid(), 'librarian')
  OR private.has_role(auth.uid(), 'receptionist')
  OR private.has_role(auth.uid(), 'transport_manager')
);

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();