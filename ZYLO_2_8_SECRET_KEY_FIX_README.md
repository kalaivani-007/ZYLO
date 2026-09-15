# ZYLO 2.8 Supabase Secret-Key Fix

Fixes billing REST requests for Supabase's current sb_secret_* key format.
The backend secret is sent through the `apikey` header only.

No SQL changes.
No frontend changes.
Do not change or expose your `.env` key.
