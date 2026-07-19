import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Initialize a Paystack transaction for an invoice.
 * Returns { authorization_url, reference } that the client uses to redirect the payer.
 */
export const initializePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { invoice_id: string; email: string; callback_url?: string }) => {
    if (!input?.invoice_id || !input?.email) throw new Error("invoice_id and email required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, student_id, amount, amount_paid, status, title")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "paid") throw new Error("Invoice already paid");

    const outstanding = Number(invoice.amount) - Number(invoice.amount_paid);
    if (outstanding <= 0) throw new Error("Nothing to pay");

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payment provider not configured");

    const reference = `UA-${invoice.id.slice(0, 8)}-${Date.now()}`;
    const amountKobo = Math.round(outstanding * 100);

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        amount: amountKobo,
        reference,
        callback_url: data.callback_url,
        metadata: { invoice_id: invoice.id, student_id: invoice.student_id, user_id: userId },
      }),
    });
    const json = (await res.json()) as {
      status: boolean;
      message: string;
      data?: { authorization_url: string; reference: string; access_code: string };
    };
    if (!res.ok || !json.status || !json.data) {
      throw new Error(json.message || "Failed to initialize payment");
    }

    // Record a pending payment row
    await supabase.from("payments").insert({
      invoice_id: invoice.id,
      student_id: invoice.student_id,
      amount: outstanding,
      reference,
      status: "pending",
      payer_email: data.email,
    });

    return {
      authorization_url: json.data.authorization_url,
      reference: json.data.reference,
    };
  });

/**
 * Verify a Paystack reference and finalize the payment + invoice status.
 * Safe to call from the client after Paystack redirects back.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference) throw new Error("reference required");
    return input;
  })
  .handler(async ({ data }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Payment provider not configured");

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const json = (await res.json()) as {
      status: boolean;
      message: string;
      data?: { status: string; amount: number; paid_at: string; reference: string };
    };
    if (!res.ok || !json.status || !json.data) {
      throw new Error(json.message || "Verification failed");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, invoice_id, amount")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!payment) throw new Error("Payment record not found");

    const paidStatus = json.data.status === "success" ? "success" : "failed";
    await supabaseAdmin
      .from("payments")
      .update({
        status: paidStatus,
        paid_at: paidStatus === "success" ? json.data.paid_at : null,
      })
      .eq("id", payment.id);

    if (paidStatus === "success") {
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

    return { status: paidStatus };
  });
