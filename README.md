# ZYLO — AI Interior Design & Visualization Platform (V1)

ZYLO V1 is a production-style starter for whole-house interior design:

- Supabase email/password authentication
- User → Homes → Spaces → Designs structure
- Private room-image storage in Supabase Storage
- Living room, bedroom, kitchen, dining, bathroom, study, kids room, balcony, staircase, entrance, terrace and garden spaces
- Existing-room style analysis through the Python/FastAPI AI backend
- Target-style + keep/remove/change instructions
- Space-specific recommendations
- Budget planner in INR
- AI redesign endpoint using Stability AI when a valid paid key is configured
- Before/after design view
- Saved design history
- Whole-house design theme
- Inspiration browser
- Interactive 3D room prototype + auto-rotation walkthrough (prototype; not automatic photogrammetry)
- Usage-event table for later credits/analytics
- Billing page shell ready for a real payment provider integration

## Important

This package intentionally contains **no secrets** and **no model weights**. Copy your existing fine-tuned MobileNetV2 weights into `ai/interior_weights_finetuned.weights.h5` and create local `.env` files from the examples.

The 3D viewer is a genuine interactive prototype, but it does not reconstruct a physically accurate 3D model from a single photograph. AI redesign requires Stability AI credits.

## Setup order

1. Create a fresh Supabase project or use your current ZYLO project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Copy `frontend/.env.local.example` to `frontend/.env.local` and fill the two public Supabase values.
4. Copy `backend/.env.example` to `backend/.env` and fill the same Supabase values plus your Stability key if you want rendering.
5. Put your model weights in `ai/interior_weights_finetuned.weights.h5`.
6. Backend: create venv, install `backend/requirements.txt`, run `uvicorn main:app --reload`.
7. Frontend: `npm install`, then `npm run dev`.

Frontend: http://localhost:3000
Backend docs: http://127.0.0.1:8000/docs
