
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Recreate policies to reference private.has_role
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
DROP POLICY IF EXISTS user_roles_self_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
DROP POLICY IF EXISTS branding_admin_write ON public.branding;
DROP POLICY IF EXISTS classes_read ON public.classes;
DROP POLICY IF EXISTS classes_admin_write ON public.classes;
DROP POLICY IF EXISTS students_admin_all ON public.students;
DROP POLICY IF EXISTS students_teacher_read ON public.students;

CREATE POLICY profiles_self_select ON public.profiles FOR SELECT USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_self_select ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY branding_admin_write ON public.branding FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY classes_read ON public.classes FOR SELECT USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher') OR private.has_role(auth.uid(), 'student') OR private.has_role(auth.uid(), 'parent'));
CREATE POLICY classes_admin_write ON public.classes FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY students_admin_all ON public.students FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY students_teacher_read ON public.students FOR SELECT USING (private.has_role(auth.uid(), 'teacher'));

-- Drop the public version now that no policies reference it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
