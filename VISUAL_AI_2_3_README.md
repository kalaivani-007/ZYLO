# ZYLO Visual AI 2.3 patch

This patch changes only:

1. `backend/main.py`
2. `frontend/src/app/space/[id]/page.js`

It does NOT replace auth, Supabase schema, storage, Homes, Spaces, design history, or the 3D component.

## What Visual AI 2.3 adds

- Structured Keep / Change / Requirements fields sent directly to the backend.
- Stronger prompt designed to preserve the uploaded room identity.
- Lower image-to-image strength (`0.52`) to reduce unwanted layout drift.
- Free `/api/redesign-preview` endpoint so prompt logic can be tested without spending Stability credits.
- Friendlier handling for no-credit, invalid-key, rate-limit and service errors.
- Image validation before generation.
- Existing 2.2 `/api/redesign-room` prompt remains backward compatible.
- Backend version changes to 2.3.0.
- Clearer generation/loading state in the workspace.

## Apply

Copy the `backend` and `frontend` folders from this patch into:

`D:\ZYLO-V1\ZYLO_FULL_V1`

Choose **Replace the files in the destination** when Windows asks.

Then restart backend and frontend.
