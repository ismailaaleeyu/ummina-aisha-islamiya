INSERT INTO public.user_roles (user_id, role)
VALUES ('25da2b9f-3e4e-4444-921f-e17af830c41e', 'parent')
ON CONFLICT DO NOTHING;

INSERT INTO public.parent_student_links (parent_user_id, student_id, relationship, is_primary)
SELECT '25da2b9f-3e4e-4444-921f-e17af830c41e', id, 'Parent', true
FROM public.students
ON CONFLICT DO NOTHING;