
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text NOT NULL UNIQUE,
  model text,
  capacity integer NOT NULL DEFAULT 0,
  driver_name text,
  driver_phone text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and transport managers manage vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'));
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  fare_per_term numeric NOT NULL DEFAULT 0,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_routes TO authenticated;
GRANT ALL ON public.transport_routes TO service_role;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users can view routes" ON public.transport_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and transport managers manage routes" ON public.transport_routes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'));
CREATE TRIGGER transport_routes_set_updated_at BEFORE UPDATE ON public.transport_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  pickup_time time,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_stops TO authenticated;
GRANT ALL ON public.route_stops TO service_role;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users can view stops" ON public.route_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and transport managers manage stops" ON public.route_stops FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'));
CREATE TRIGGER route_stops_set_updated_at BEFORE UPDATE ON public.route_stops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.student_transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES public.route_stops(id) ON DELETE SET NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, route_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_transport TO authenticated;
GRANT ALL ON public.student_transport TO service_role;
ALTER TABLE public.student_transport ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and transport managers manage student transport" ON public.student_transport FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager'));
CREATE POLICY "Staff can view student transport" ON public.student_transport FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'transport_manager') OR private.has_role(auth.uid(), 'teacher') OR private.has_role(auth.uid(), 'receptionist'));
CREATE POLICY "Students can view own transport" ON public.student_transport FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_transport.student_id AND s.user_id = auth.uid()));
CREATE TRIGGER student_transport_set_updated_at BEFORE UPDATE ON public.student_transport FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
