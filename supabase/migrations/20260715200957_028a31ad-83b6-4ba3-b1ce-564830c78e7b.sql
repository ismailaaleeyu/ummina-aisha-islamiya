
-- CLASSES
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level text,
  section text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, section)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY classes_read ON public.classes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'student') OR
    public.has_role(auth.uid(), 'parent')
  );
CREATE POLICY classes_admin_write ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STUDENTS
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no text NOT NULL UNIQUE,
  full_name text NOT NULL,
  gender text CHECK (gender IN ('male','female')),
  date_of_birth date,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  guardian_name text,
  guardian_phone text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','graduated','withdrawn')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY students_admin_all ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY students_teacher_read ON public.students FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY students_self_read ON public.students FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_status ON public.students(status);
