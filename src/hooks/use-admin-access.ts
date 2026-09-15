import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdminAccess() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (active) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      if (active) {
        setIsAdmin((roleRows ?? []).some((row) => row.role === "admin"));
        setLoading(false);
      }
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, []);

  return { isAdmin, loading };
}