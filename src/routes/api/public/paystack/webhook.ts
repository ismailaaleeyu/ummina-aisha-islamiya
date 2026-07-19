import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const signature = request.headers.get("x-paystack-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha512", secret).update(body).digest("hex");

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body) as {
          event: string;
          data: { reference: string; status: string; amount: number; paid_at?: string };
        };

        if (payload.event === "charge.success") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const ref = payload.data.reference;

          const { data: payment } = await supabaseAdmin
            .from("payments")
            .select("id, invoice_id, amount, status")
            .eq("reference", ref)
            .maybeSingle();

          if (payment && payment.status !== "success") {
            await supabaseAdmin
              .from("payments")
              .update({
                status: "success",
                paid_at: payload.data.paid_at ?? new Date().toISOString(),
              })
              .eq("id", payment.id);

            const { data: inv } = await supabaseAdmin
              .from("invoices")
              .select("amount, amount_paid")
              .eq("id", payment.invoice_id)
              .maybeSingle();
            if (inv) {
              const newPaid = Number(inv.amount_paid) + Number(payment.amount);
              const newStatus =
                newPaid >= Number(inv.amount) ? "paid" : newPaid > 0 ? "partial" : "unpaid";
              await supabaseAdmin
                .from("invoices")
                .update({ amount_paid: newPaid, status: newStatus })
                .eq("id", payment.invoice_id);
            }
          }
        }

        return new Response("ok");
      },
    },
  },
});
