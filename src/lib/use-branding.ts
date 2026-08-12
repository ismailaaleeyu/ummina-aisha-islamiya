import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Branding = {
  school_name: string;
  tagline: string | null;
  primary_color: string;
  accent_color: string;
  logo_url: string | null;
};

const FALLBACK: Branding = {
  school_name: "Ummina Aisha School",
  tagline: "Yola, Nigeria",
  primary_color: "#7cc47a",
  accent_color: "#f7f3e3",
  logo_url: null,
};

/** Apply branding colors to the running app by overriding CSS custom properties. */
export function applyBrandingColors(b: Branding) {
  const root = document.documentElement;
  if (b.primary_color) {
    root.style.setProperty("--primary", b.primary_color);
    root.style.setProperty("--ring", b.primary_color);
    root.style.setProperty("--leaf", b.primary_color);
    root.style.setProperty("--sidebar-primary", b.primary_color);
    root.style.setProperty("--sidebar-ring", b.primary_color);
    root.style.setProperty("--chart-1", b.primary_color);
  }
  if (b.accent_color) {
    root.style.setProperty("--accent", b.accent_color);
    root.style.setProperty("--sidebar-accent", b.accent_color);
  }
}

/**
 * Fetches the single branding row and applies its colors globally.
 * Call once near the app root (works for both public and protected routes
 * because branding has a public-read policy).
 */
export function useBranding() {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("branding")
        .select("school_name, tagline, primary_color, accent_color, logo_url")
        .eq("id", true)
        .maybeSingle();
      if (cancelled) return;
      const b = (data as Branding | null) ?? FALLBACK;
      setBranding(b);
      applyBrandingColors(b);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return branding;
}
