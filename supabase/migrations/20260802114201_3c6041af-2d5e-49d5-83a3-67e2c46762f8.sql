CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  isbn text,
  category text,
  publisher text,
  total_copies integer NOT NULL DEFAULT 1,
  available_copies integer NOT NULL DEFAULT 1,
  shelf_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can browse books" ON public.books
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Librarians and admins manage books" ON public.books
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'librarian'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'librarian'));

CREATE TRIGGER set_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.book_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  borrowed_at date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  returned_at date,
  status text NOT NULL DEFAULT 'borrowed',
  notes text,
  issued_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_loans TO authenticated;
GRANT ALL ON public.book_loans TO service_role;
ALTER TABLE public.book_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Librarians and admins manage loans" ON public.book_loans
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'librarian'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'librarian'));
CREATE POLICY "Students view their own loans" ON public.book_loans
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = book_loans.student_id AND s.user_id = auth.uid()));

CREATE TRIGGER set_book_loans_updated_at BEFORE UPDATE ON public.book_loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_book_loans_book ON public.book_loans(book_id);
CREATE INDEX idx_book_loans_student ON public.book_loans(student_id);