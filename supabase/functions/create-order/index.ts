// Razorpay order तयार करतो. शुल्क database मधून येतं, विद्यार्थ्याने पाठवलेलं नाही.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (!user) return json({ error: "आधी login करा" }, 401);

    const { room_id } = await req.json();
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: room } = await admin.from("rooms").select("id, hidden, rented, owner_id").eq("id", room_id).maybeSingle();
    if (!room || room.hidden || room.rented) return json({ error: "ही रूम आता उपलब्ध नाही" }, 400);
    if (room.owner_id === user.id) return json({ error: "ही तुमचीच रूम आहे" }, 400);

    const { data: s } = await admin.from("settings").select("view_fee_paise").eq("id", 1).single();
    const keyId = Deno.env.get("RAZORPAY_KEY_ID")!, secret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${keyId}:${secret}`), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: s!.view_fee_paise, currency: "INR", receipt: `${String(room_id).slice(0, 8)}-${Date.now()}`, notes: { user_id: user.id, room_id } }),
    });
    const order = await res.json();
    if (!res.ok) return json({ error: "पेमेंट सुरू करता आले नाही" }, 502);
    return json({ order_id: order.id, amount: order.amount, key_id: keyId });
  } catch (_e) {
    return json({ error: "काहीतरी चुकलं, पुन्हा प्रयत्न करा" }, 500);
  }
});
