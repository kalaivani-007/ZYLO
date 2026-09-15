# ZYLO 2.8 — SaaS Credits + Payments
Adds 3 free starting credits, Starter ₹199/10 credits, Pro ₹499/30 credits, server-side Razorpay order creation/signature verification, generation credit enforcement, and /billing UI.

Run `supabase/ZYLO_2_8_BILLING.sql` once.

Backend `.env` additions:
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

Use Razorpay TEST MODE keys only for 2.8 testing. Never expose these as NEXT_PUBLIC variables.
