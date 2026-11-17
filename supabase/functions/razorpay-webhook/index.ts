// Razorpay ने पेमेंट मिळाल्याचं कळवल्यावर (सही तपासून) unlock नोंदवतो.
// Supabase मध्ये हे function "Verify JWT" बंद करून deploy करा (Razorpay कडे JWT नसतो).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function sign(body: string, secret: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)));
}

Deno.serve(async (req) => {
  const raw = await req.text();
  const got = req.headers.get("x-razorpay-signature") ?? "";
  if (got !== await sign(raw, Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!)) return new Response("bad signature", { status: 401 });

  const ev = JSON.parse(raw);
  if (ev.event !== "payment.captured") return new Response("ignored", { status: 200 });
  const p = ev.payload.payment.entity;

  const keyId = Deno.env.get("RAZORPAY_KEY_ID")!, secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
  const o = await fetch(`https://api.razorpay.com/v1/orders/${p.order_id}`, { headers: { Authorization: "Basic " + btoa(`${keyId}:${secret}`) } });
  if (!o.ok) return new Response("order fetch failed", { status: 500 });
  const { notes } = await o.json();
  if (!notes?.user_id || !notes?.room_id) return new Response("no notes", { status: 200 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await admin.from("settings").select("unlock_minutes").eq("id", 1).single();
  const expires = new Date(Date.now() + s!.unlock_minutes * 60_000).toISOString();
  const { error } = await admin.from("unlocks").upsert(
    { user_id: notes.user_id, room_id: notes.room_id, payment_id: p.id, amount_paise: p.amount, expires_at: expires },
    { onConflict: "payment_id", ignoreDuplicates: true },
  );
  return new Response(error ? "db error" : "ok", { status: error ? 500 : 200 });
});
