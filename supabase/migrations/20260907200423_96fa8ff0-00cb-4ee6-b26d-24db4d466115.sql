CREATE TABLE public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'Parent',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_student_links TO authenticated;
GRANT ALL ON public.parent_student_links TO service_role;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents view their own child links" ON public.parent_student_links
  FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());
CREATE POLICY "Admins manage parent child links" ON public.parent_student_links
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE INDEX parent_student_links_parent_idx ON public.parent_student_links(parent_user_id);
CREATE INDEX parent_student_links_student_idx ON public.parent_student_links(student_id);
CREATE TRIGGER parent_student_links_updated_at BEFORE UPDATE ON public.parent_student_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Parents view linked students" ON public.students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = students.id AND psl.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents view linked attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = attendance.student_id AND psl.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents view linked invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = invoices.student_id AND psl.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents view linked payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = payments.student_id AND psl.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents create linked payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = payments.student_id AND psl.parent_user_id = auth.uid()
    )
  );

CREATE POLICY "Parents view linked scores" ON public.exam_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = exam_scores.student_id AND psl.parent_user_id = auth.uid()
    )
  );