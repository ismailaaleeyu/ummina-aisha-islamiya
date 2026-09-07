CREATE POLICY "Students view own attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = attendance.student_id AND s.user_id = auth.uid()
    )
  );