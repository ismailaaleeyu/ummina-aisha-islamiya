
-- SUBJECTS
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view subjects" ON public.subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXAMS
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  term text,
  academic_year text,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view exams" ON public.exams
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'teacher')
    OR private.has_role(auth.uid(), 'accountant')
    OR private.has_role(auth.uid(), 'student')
    OR private.has_role(auth.uid(), 'parent')
  );
CREATE POLICY "Staff manage exams" ON public.exams
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXAM SCORES
CREATE TABLE public.exam_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  score numeric(6,2) NOT NULL DEFAULT 0,
  max_score numeric(6,2) NOT NULL DEFAULT 100,
  remarks text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_scores TO authenticated;
GRANT ALL ON public.exam_scores TO service_role;
ALTER TABLE public.exam_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view all scores" ON public.exam_scores
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'teacher')
    OR private.has_role(auth.uid(), 'accountant')
  );

CREATE POLICY "Student views own scores" ON public.exam_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = exam_scores.student_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Staff manage scores" ON public.exam_scores
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER trg_exam_scores_updated BEFORE UPDATE ON public.exam_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_exam_scores_exam ON public.exam_scores(exam_id);
CREATE INDEX idx_exam_scores_student ON public.exam_scores(student_id);
