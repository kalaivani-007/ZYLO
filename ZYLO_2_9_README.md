# ZYLO 2.9 — Testing + Production Polish

Final 2.x milestone. This patch keeps the existing architecture and hardens the highest-risk billing paths.

## Changes
- Backend version 2.9.0.
- Atomic AI-credit consumption using a Supabase transaction/RPC.
- Atomic, idempotent Razorpay payment finalization: payment status, credit grant and usage event happen in one DB transaction.
- Duplicate payment retries do not grant credits twice.
- Billing UI reports the new balance and handles already-verified callbacks clearly.
- No provider keys are included in this patch.

## Apply
1. Copy the patch contents into the root of `D:\ZYLO-V1\ZYLO_FULL_V1` and replace matching files.
2. Run `supabase/ZYLO_2_9_PRODUCTION_POLISH.sql` once in the Supabase SQL Editor.
3. Restart the backend and frontend.
4. Check `/api/status` shows version/billing 2.9.
5. Test billing in Razorpay Test Mode only.

## Before live launch
Keep Razorpay in Test Mode until deployment, HTTPS, live-domain configuration, webhook reconciliation and final live-payment checks are completed. ZYLO 2.9 hardens the local V1 flow but does not claim mature production-scale payment infrastructure.
