import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "librarian",
  "hr",
  "receptionist",
  "transport_manager",
] as const;

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  roles: z.array(z.enum(ROLES)).min(1),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: roleRows, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin");
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRows || roleRows.length === 0) {
      throw new Error("Only administrators can create users");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const userId = created.user.id;

    await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName, phone: data.phone ?? null })
      .eq("id", userId);

    // Replace default role assignment with the selected roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert(data.roles.map((role) => ({ user_id: userId, role })));
    if (insErr) throw new Error(insErr.message);

    return { id: userId, email: data.email };
  });
