
-- FEE STRUCTURES
CREATE TABLE public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  term TEXT,
  session TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read fee structures" ON public.fee_structures
  FOR SELECT TO authenticated USING (
    private.has_role(auth.uid(),'admin') OR
    private.has_role(auth.uid(),'accountant') OR
    private.has_role(auth.uid(),'teacher') OR
    private.has_role(auth.uid(),'student') OR
    private.has_role(auth.uid(),'parent')
  );
CREATE POLICY "Finance manages fee structures" ON public.fee_structures
  FOR ALL TO authenticated USING (
    private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'accountant')
  ) WITH CHECK (
    private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'accountant')
  );

CREATE TRIGGER fee_structures_updated_at BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INVOICES
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  due_date DATE,
  term TEXT,
  session TEXT,
  notes TEXT,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages invoices" ON public.invoices
  FOR ALL TO authenticated USING (
    private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'accountant')
  ) WITH CHECK (
    private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'accountant')
  );
CREATE POLICY "Teachers view invoices" ON public.invoices
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'teacher'));
CREATE POLICY "Students view own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = invoices.student_id AND s.user_id = auth.uid())
  );

CREATE INDEX invoices_student_id_idx ON public.invoices(student_id);
CREATE INDEX invoices_status_idx ON public.invoices(status);

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  provider TEXT NOT NULL DEFAULT 'paystack',
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','abandoned')),
  paid_at TIMESTAMPTZ,
  payer_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance manages payments" ON public.payments
  FOR ALL TO authenticated USING (
    private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'accountant')
  ) WITH CHECK (
    private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'accountant')
  );
CREATE POLICY "Teachers view payments" ON public.payments
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'teacher'));
CREATE POLICY "Students view own payments" ON public.payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = payments.student_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Students create own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = payments.student_id AND s.user_id = auth.uid())
  );

CREATE INDEX payments_invoice_id_idx ON public.payments(invoice_id);
CREATE INDEX payments_reference_idx ON public.payments(reference);

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
