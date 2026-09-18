import base64
import hashlib
import hmac
import time
import io
import os
from pathlib import Path
from typing import Optional

import numpy as np
import requests
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from anyio import to_thread
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
MODEL_WEIGHTS_PATH = os.getenv(
    "MODEL_WEIGHTS_PATH",
    "../ai/interior_weights_finetuned.weights.h5",
)

CLASS_NAMES = ["boho", "industrial", "minimalist", "modern", "scandinavian"]
_model = None
_model_error = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the TensorFlow model once so the first request is faster.
    await to_thread.run_sync(get_model)
    yield


app = FastAPI(title="ZYLO AI API", version="2.9.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://zylo-zylo12.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_model():
    import tensorflow as tf

    base = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = True

    for layer in base.layers[:-20]:
        layer.trainable = False

    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = tf.keras.layers.Rescaling(1.0 / 127.5, offset=-1)(inputs)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(5, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)

    weights = Path(MODEL_WEIGHTS_PATH).resolve()
    if not weights.exists():
        raise FileNotFoundError(f"Model weights not found: {weights}")

    model.load_weights(weights, skip_mismatch=True)
    return model


def get_model():
    global _model, _model_error

    if _model is None and _model_error is None:
        try:
            _model = build_model()
        except Exception as exc:
            _model_error = str(exc)

    return _model


def require_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Login required")

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(500, "Supabase backend configuration is missing")

    token = authorization.split(" ", 1)[1]

    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": SUPABASE_KEY,
        },
        timeout=10,
    )

    if response.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")

    return response.json()


def validate_uploaded_image(content: bytes):
    if not content:
        raise HTTPException(400, "The uploaded image is empty")

    try:
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Please upload a valid JPG, PNG or WebP image")

    width, height = image.size
    if width < 256 or height < 256:
        raise HTTPException(
            400,
            "Please upload a clearer image at least 256 × 256 pixels",
        )

    return image


def read_image(content: bytes):
    image = validate_uploaded_image(content).resize((224, 224))
    return np.asarray(image, dtype=np.float32)


SPACE_LIBRARY = {
    "Living Room": {
        "furniture": [
            "comfortable sofa arrangement",
            "nested coffee table",
            "closed media storage",
        ],
        "lighting": [
            "warm ceiling light",
            "floor lamp near seating",
            "soft accent light",
        ],
        "materials": ["wood", "textured fabric", "matte metal"],
        "decor": ["large art", "rug", "indoor plant"],
    },
    "Bedroom": {
        "furniture": [
            "storage bed",
            "compact bedside tables",
            "wardrobe organizers",
        ],
        "lighting": [
            "warm bedside lamps",
            "soft ceiling light",
            "wardrobe task light",
        ],
        "materials": ["cotton or linen", "light wood", "soft upholstery"],
        "decor": ["curtains", "one calming artwork", "minimal cushions"],
    },
    "Kitchen": {
        "furniture": [
            "drawer organizers",
            "tall pantry storage",
            "compact breakfast ledge where possible",
        ],
        "lighting": [
            "under-cabinet task light",
            "neutral ceiling light",
            "countertop task light",
        ],
        "materials": [
            "quartz or durable counter",
            "easy-clean laminate",
            "anti-skid flooring",
        ],
        "decor": [
            "small herb planters",
            "minimal counter accessories",
            "coordinated jars",
        ],
    },
    "Balcony": {
        "furniture": [
            "foldable weather-safe chairs",
            "compact bench",
            "vertical plant rack",
        ],
        "lighting": [
            "warm wall lights",
            "solar accent lights",
            "soft string lights",
        ],
        "materials": [
            "weather-safe wood composite",
            "outdoor fabric",
            "anti-skid tile",
        ],
        "decor": ["vertical greenery", "planters", "small outdoor rug"],
    },
    "Staircase": {
        "furniture": [
            "under-stair storage",
            "slim console if space permits",
            "wall-mounted shelf",
        ],
        "lighting": ["step lights", "wall sconces", "landing pendant"],
        "materials": ["wood accents", "metal railing", "textured wall finish"],
        "decor": [
            "gallery wall",
            "single statement artwork",
            "indoor plant at landing",
        ],
    },
    "Bathroom": {
        "furniture": ["floating vanity", "mirror cabinet", "niche storage"],
        "lighting": [
            "mirror task light",
            "moisture-safe ceiling light",
            "soft ambient light",
        ],
        "materials": [
            "anti-skid tile",
            "moisture-safe laminate",
            "stone-look surfaces",
        ],
        "decor": [
            "minimal bottles",
            "small humidity-safe plant",
            "neutral towels",
        ],
    },
    "Dining Room": {
        "furniture": [
            "correctly scaled dining table",
            "comfortable dining chairs",
            "slim crockery storage",
        ],
        "lighting": [
            "centered pendant",
            "warm ambient light",
            "buffet accent light",
        ],
        "materials": [
            "durable wood finish",
            "washable upholstery",
            "easy-clean flooring",
        ],
        "decor": ["simple centerpiece", "wall art", "textured runner"],
    },
    "Study / Office": {
        "furniture": [
            "ergonomic desk",
            "supportive chair",
            "closed document storage",
        ],
        "lighting": [
            "glare-free task lamp",
            "neutral ceiling light",
            "indirect shelf light",
        ],
        "materials": ["matte worktop", "acoustic textile", "light wood"],
        "decor": ["pinboard", "small plant", "minimal desk accessories"],
    },
    "Kids Room": {
        "furniture": [
            "rounded-edge storage",
            "flexible study desk",
            "accessible toy storage",
        ],
        "lighting": ["soft ceiling light", "study task lamp", "night light"],
        "materials": ["washable paint", "durable laminate", "soft rug"],
        "decor": [
            "display shelf",
            "removable wall graphics",
            "storage baskets",
        ],
    },
    "Terrace": {
        "furniture": [
            "weather-safe lounge seating",
            "compact outdoor table",
            "movable planters",
        ],
        "lighting": [
            "weather-rated wall lights",
            "path lights",
            "soft ambient strings",
        ],
        "materials": [
            "outdoor tile",
            "powder-coated metal",
            "UV-resistant fabric",
        ],
        "decor": ["planter groups", "shade element", "outdoor rug"],
    },
    "Entrance / Foyer": {
        "furniture": ["slim shoe storage", "small console", "wall hooks"],
        "lighting": [
            "warm ceiling light",
            "mirror accent light",
            "entry wall sconce",
        ],
        "materials": [
            "durable flooring",
            "wood accent",
            "easy-clean wall finish",
        ],
        "decor": ["mirror", "key tray", "single plant"],
    },
    "Outdoor / Garden": {
        "furniture": [
            "weather-safe seating",
            "outdoor table",
            "storage bench",
        ],
        "lighting": ["path lighting", "wall lighting", "plant uplights"],
        "materials": [
            "outdoor pavers",
            "weather-safe metal",
            "UV-resistant fabric",
        ],
        "decor": ["layered planting", "planters", "defined pathway"],
    },
}


STYLE_COLORS = {
    "Modern": ["Warm White", "Charcoal", "Walnut", "Muted Gold"],
    "Minimalist": ["Soft White", "Warm Grey", "Light Oak", "Black Accent"],
    "Scandinavian": ["Off White", "Light Oak", "Sage", "Dusty Blue"],
    "Industrial": ["Concrete Grey", "Matte Black", "Rust Brown", "Warm Wood"],
    "Boho": ["Cream", "Terracotta", "Olive", "Natural Rattan"],
}


SPACE_GOALS = {
    "Living Room": [
        "Improve conversation seating",
        "Create a cleaner TV wall",
        "Add concealed storage",
    ],
    "Bedroom": [
        "Improve sleep-friendly lighting",
        "Increase wardrobe/storage efficiency",
        "Keep circulation around the bed clear",
    ],
    "Kitchen": [
        "Improve counter workflow",
        "Increase closed storage",
        "Prioritize easy-clean and heat-safe finishes",
    ],
    "Dining Room": [
        "Center the dining zone",
        "Use comfortable circulation clearance",
        "Add focused pendant lighting",
    ],
    "Study / Office": [
        "Create an ergonomic work zone",
        "Control screen glare",
        "Add cable and document storage",
    ],
    "Kids Room": [
        "Use flexible storage",
        "Keep play circulation safe",
        "Choose durable easy-clean finishes",
    ],
    "Balcony": [
        "Use weather-safe furniture",
        "Add greenery without blocking circulation",
        "Create soft evening lighting",
    ],
    "Staircase": [
        "Improve step safety and lighting",
        "Use vertical wall space",
        "Use under-stair volume efficiently",
    ],
    "Bathroom": [
        "Improve moisture-safe storage",
        "Prioritize anti-skid surfaces",
        "Add strong mirror/task lighting",
    ],
    "Terrace": [
        "Create shaded seating",
        "Use weather-resistant materials",
        "Plan low-maintenance greenery",
    ],
    "Entrance / Foyer": [
        "Create a clear arrival zone",
        "Add shoe/key storage",
        "Use one strong visual focal point",
    ],
    "Outdoor / Garden": [
        "Define seating and planting zones",
        "Use outdoor-rated lighting",
        "Keep pathways clear and durable",
    ],
}


def make_design_plan(
    space_type: str,
    target_style: str,
    budget: int,
    keep: str = "",
    change: str = "",
    requirements: str = "",
):
    base = SPACE_LIBRARY.get(space_type, SPACE_LIBRARY["Living Room"])
    budget = max(0, int(budget or 0))

    keep_items = [
        x.strip()
        for x in keep.replace("\n", ",").split(",")
        if x.strip()
    ]

    change_items = [
        x.strip()
        for x in change.replace("\n", ",").split(",")
        if x.strip()
    ]

    goals = SPACE_GOALS.get(
        space_type,
        ["Preserve circulation", "Improve storage", "Use practical lighting"],
    )

    return {
        "space_type": space_type,
        "target_style": target_style,
        "colors": STYLE_COLORS.get(target_style, STYLE_COLORS["Modern"]),
        "furniture": base["furniture"],
        "lighting": base["lighting"],
        "materials": base["materials"],
        "decor": base["decor"],
        "keep": keep_items,
        "change": change_items,
        "priorities": goals,
        "requirements": requirements.strip(),
        "budget_plan": {
            "furniture": round(budget * 0.40),
            "materials": round(budget * 0.22),
            "lighting": round(budget * 0.13),
            "decor": round(budget * 0.15),
            "buffer": round(budget * 0.10),
        },
        "tip": (
            f"For this {space_type.lower()}, preserve the items marked Keep first, "
            f"then spend on the Change list and the highest-impact "
            f"{target_style.lower()} upgrades."
        ),
    }


def clean_text(value: str, fallback: str):
    value = (value or "").strip()
    return value if value else fallback


def build_redesign_instruction(
    space_type: str,
    target_style: str,
    budget: int,
    keep: str,
    change: str,
    requirements: str,
    intensity: str = "Balanced Redesign",
    feedback: str = "",
    variation: int = 1,
):
    keep_text = clean_text(
        keep,
        "the room architecture, doors, windows, flooring and useful existing items",
    )
    change_text = clean_text(
        change,
        "only the elements required to achieve the target style",
    )
    requirement_text = clean_text(
        requirements,
        "practical, realistic and easy to maintain",
    )

    budget = max(0, int(budget or 0))
    intensity = clean_text(intensity, "Balanced Redesign")
    feedback_text = clean_text(feedback, "No previous-design feedback; follow the main request.")
    variation = max(1, int(variation or 1))

    intensity_rules = {
        "Light Refresh": (
            "Make a restrained refresh. Preserve existing furniture placement and major furnishings. "
            "Focus on lighting, colors, textiles, decor and small affordable additions."
        ),
        "Balanced Redesign": (
            "Make a balanced redesign. Preserve the room structure and KEEP items, while allowing "
            "requested furniture, lighting, storage and decor changes."
        ),
        "Major Makeover": (
            "Allow a stronger makeover of movable furnishings, finishes, lighting and decor, but "
            "still preserve the photographed architecture, viewpoint and every KEEP item."
        ),
    }
    intensity_rule = intensity_rules.get(intensity, intensity_rules["Balanced Redesign"])

    return f"""
Redesign the EXACT uploaded {space_type} photograph as a realistic interior-design concept.

NON-NEGOTIABLE PRESERVATION:
- Preserve the original camera position, perspective, room dimensions and structural geometry.
- Preserve walls, ceiling shape, doors, windows, openings, railings, columns and fixed architecture.
- Do not invent another room or change the viewpoint.
- KEEP these elements clearly recognizable and in the same approximate position: {keep_text}.

REQUESTED CHANGES:
- Improve or replace only these requested elements where practical: {change_text}.
- Target interior style: {target_style}.
- User requirements: {requirement_text}.
- Redesign intensity: {intensity}. {intensity_rule}
- Approximate budget: INR {budget:,}. Keep the concept visually believable for this budget.
- Prefer affordable, realistic upgrades when the budget is modest. Do not visually imply a luxury renovation when the stated budget is modest.
- Maintain usable circulation and furniture scale appropriate to the photographed space.
- Follow-up feedback from the user: {feedback_text}.
- Variation number: {variation}. Create a distinct but still compliant interpretation; do not violate KEEP instructions just to make the variation different.

VISUAL QUALITY:
- Photorealistic finished interior.
- Natural materials, realistic shadows and practical lighting.
- No people, no text, no labels, no logos, no watermark.
- Do not create a floor plan, mood board, collage or split image.
- Return one redesigned view matching the original photograph.

Highest priority: preserve the uploaded space identity and all KEEP instructions.
""".strip()


def friendly_stability_error(response: requests.Response):
    status = response.status_code
    raw = (response.text or "")[:800]

    if status == 402:
        return 402, (
            "AI generation credits are unavailable. Your design plan is safe; "
            "add Stability AI credits before generating another visual."
        )

    if status in (401, 403):
        return status, (
            "The Stability AI key is invalid or does not have permission to generate images."
        )

    if status == 429:
        return 429, (
            "The image service is temporarily rate-limited. Please wait a little and try again."
        )

    if status >= 500:
        return 503, (
            "The image-generation service is temporarily unavailable. "
            "Your ZYLO design plan has not been lost."
        )

    return status, f"AI redesign failed: {raw or 'Unknown image service error'}"



CREDIT_PACKS = {
    "starter": {"name": "Starter", "price_inr": 199, "credits": 10},
    "pro": {"name": "Pro", "price_inr": 499, "credits": 30},
}
FREE_STARTER_CREDITS = 3

def admin_headers():
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(503, "Billing database service key is not configured on the backend.")
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }

def ensure_credit_account(user_id: str):
    r=requests.get(f"{SUPABASE_URL}/rest/v1/user_credits",headers=admin_headers(),params={"user_id":f"eq.{user_id}","select":"*","limit":"1"},timeout=10)
    if r.status_code>=300: raise HTTPException(503,"Could not read the ZYLO credit account.")
    rows=r.json()
    if rows: return rows[0]
    r=requests.post(f"{SUPABASE_URL}/rest/v1/user_credits",headers={**admin_headers(),"Prefer":"return=representation"},json={"user_id":user_id,"balance":FREE_STARTER_CREDITS,"lifetime_purchased":0,"lifetime_used":0},timeout=10)
    if r.status_code>=300: raise HTTPException(503,"Could not create the ZYLO credit account.")
    return r.json()[0]

def update_credit_account(user_id: str,payload: dict):
    r=requests.patch(f"{SUPABASE_URL}/rest/v1/user_credits",headers={**admin_headers(),"Prefer":"return=representation"},params={"user_id":f"eq.{user_id}"},json=payload,timeout=10)
    if r.status_code>=300: raise HTTPException(503,"Could not update the ZYLO credit account.")
    return r.json()[0]

def log_credit_event(user_id,event_type,units,metadata=None):
    r=requests.post(f"{SUPABASE_URL}/rest/v1/usage_events",headers=admin_headers(),json={"user_id":user_id,"event_type":event_type,"units":units,"metadata":metadata or {}},timeout=10)
    if r.status_code>=300: raise HTTPException(503,"Could not record the ZYLO credit event.")

def create_payment_record(user_id,order_id,pack_id):
    p=CREDIT_PACKS[pack_id]
    r=requests.post(f"{SUPABASE_URL}/rest/v1/payment_orders",headers=admin_headers(),json={"user_id":user_id,"razorpay_order_id":order_id,"pack_id":pack_id,"amount_inr":p["price_inr"],"credits":p["credits"],"status":"created"},timeout=10)
    if r.status_code>=300: raise HTTPException(503,"Could not save the payment order.")

def get_payment_record(user_id,order_id):
    r=requests.get(f"{SUPABASE_URL}/rest/v1/payment_orders",headers=admin_headers(),params={"user_id":f"eq.{user_id}","razorpay_order_id":f"eq.{order_id}","select":"*","limit":"1"},timeout=10)
    if r.status_code>=300: raise HTTPException(503,"Could not verify the payment order.")
    rows=r.json(); return rows[0] if rows else None

def mark_payment_paid(order_id,payment_id):
    r=requests.patch(f"{SUPABASE_URL}/rest/v1/payment_orders",headers=admin_headers(),params={"razorpay_order_id":f"eq.{order_id}"},json={"status":"paid","razorpay_payment_id":payment_id},timeout=10)
    if r.status_code>=300: raise HTTPException(503,"Could not finalize the payment record.")

def require_generation_credit(user_id):
    a=ensure_credit_account(user_id)
    if int(a.get("balance",0))<1: raise HTTPException(402,"You have no ZYLO generation credits left. Open Plan to add credits.")
    return a

def consume_generation_credit(user_id, _account=None):
    # 2.9: atomic database transaction prevents concurrent generations from
    # spending the same last credit. The SQL patch creates this RPC.
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/zylo_consume_generation_credit",
        headers=admin_headers(),
        json={"p_user_id": user_id},
        timeout=10,
    )
    if r.status_code == 409:
        raise HTTPException(402, "You have no ZYLO generation credits left. Open Plan to add credits.")
    if r.status_code >= 300:
        raise HTTPException(503, "Could not safely consume the ZYLO generation credit.")
    result = r.json()
    if isinstance(result, list):
        result = result[0] if result else {}
    if not result.get("success", False):
        raise HTTPException(402, "You have no ZYLO generation credits left. Open Plan to add credits.")
    return {"balance": int(result.get("balance", 0)), "lifetime_used": int(result.get("lifetime_used", 0))}

@app.get("/api/billing")
def billing_status(user=Depends(require_user)):
    a=ensure_credit_account(user["id"])
    return {"success":True,"balance":int(a.get("balance",0)),"lifetime_purchased":int(a.get("lifetime_purchased",0)),"lifetime_used":int(a.get("lifetime_used",0)),"free_starting_credits":FREE_STARTER_CREDITS,"packs":CREDIT_PACKS,"payments_ready":bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)}

@app.post("/api/billing/create-order")
def create_billing_order(pack_id: str=Form(...),user=Depends(require_user)):
    if pack_id not in CREDIT_PACKS: raise HTTPException(400,"Unknown ZYLO credit pack.")
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET: raise HTTPException(503,"Razorpay test keys are not configured yet. No payment was created.")
    p=CREDIT_PACKS[pack_id]
    r=requests.post("https://api.razorpay.com/v1/orders",auth=(RAZORPAY_KEY_ID,RAZORPAY_KEY_SECRET),json={"amount":p["price_inr"]*100,"currency":"INR","receipt":f"zylo_{user['id'][:8]}_{int(time.time())}","notes":{"zylo_user_id":user["id"],"pack_id":pack_id}},timeout=20)
    if r.status_code>=300: raise HTTPException(502,"Razorpay could not create the payment order.")
    order=r.json(); create_payment_record(user["id"],order["id"],pack_id)
    return {"success":True,"key_id":RAZORPAY_KEY_ID,"order_id":order["id"],"amount":order["amount"],"currency":order["currency"],"pack":p}

@app.post("/api/billing/verify")
def verify_billing_payment(razorpay_order_id:str=Form(...),razorpay_payment_id:str=Form(...),razorpay_signature:str=Form(...),user=Depends(require_user)):
    if not RAZORPAY_KEY_SECRET: raise HTTPException(503,"Razorpay is not configured.")
    payment=get_payment_record(user["id"],razorpay_order_id)
    if not payment: raise HTTPException(404,"ZYLO payment order not found.")
    if payment.get("status")=="paid":
        a=ensure_credit_account(user["id"]); return {"success":True,"already_verified":True,"balance":int(a.get("balance",0))}
    expected=hmac.new(RAZORPAY_KEY_SECRET.encode(),f"{razorpay_order_id}|{razorpay_payment_id}".encode(),hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected,razorpay_signature): raise HTTPException(400,"Payment signature verification failed.")
    # 2.9: finalize the payment and grant credits in one database transaction.
    # This makes retries idempotent and removes the grant-before-mark-paid crash window.
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/zylo_finalize_payment",
        headers=admin_headers(),
        json={
            "p_user_id": user["id"],
            "p_order_id": razorpay_order_id,
            "p_payment_id": razorpay_payment_id,
        },
        timeout=10,
    )
    if r.status_code >= 300:
        raise HTTPException(503, "Payment was verified, but ZYLO could not safely finalize the credit purchase. Please retry verification; credits will not be duplicated.")
    result = r.json()
    if isinstance(result, list):
        result = result[0] if result else {}
    if not result.get("success", False):
        raise HTTPException(400, result.get("message", "Could not finalize payment."))
    return {
        "success": True,
        "already_verified": bool(result.get("already_verified", False)),
        "credits_added": int(result.get("credits_added", 0)),
        "balance": int(result.get("balance", 0)),
    }

@app.get("/")
def root():
    return {"name": "ZYLO AI API", "version": "2.9.0"}


@app.get("/api/status")
def status():
    return {
        "status": "online",
        "style_model": "ready" if get_model() is not None else "missing",
        "model_error": _model_error,
        "redesign_ai": "configured" if STABILITY_API_KEY else "not configured",
        "whole_house": "ready",
        "recommendations": "ready",
        "visual_ai": "2.5",
        "billing": "2.9",
        "payments": "configured" if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET else "test setup pending",
    }


@app.post("/api/analyze-room")
async def analyze_room(
    file: UploadFile = File(...),
    space_type: str = Form("Room"),
    user=Depends(require_user),
):
    model = get_model()

    if model is None:
        raise HTTPException(503, _model_error or "Style model unavailable")

    content = await file.read()
    array = read_image(content)

    preds = await to_thread.run_sync(
        lambda: model.predict(np.expand_dims(array, 0), verbose=0)[0]
    )

    idx = int(np.argmax(preds))

    return {
        "success": True,
        "space_type": space_type,
        "predicted_style": CLASS_NAMES[idx],
        "confidence": round(float(preds[idx]) * 100, 2),
        "predictions": {
            name: round(float(preds[i]) * 100, 2)
            for i, name in enumerate(CLASS_NAMES)
        },
    }


@app.get("/api/recommendations")
def recommendations(
    space_type: str = "Living Room",
    target_style: str = "Modern",
    budget: int = 25000,
    user=Depends(require_user),
):
    return make_design_plan(space_type, target_style, budget)


@app.post("/api/design-plan")
def design_plan(
    space_type: str = Form("Living Room"),
    target_style: str = Form("Modern"),
    budget: int = Form(25000),
    keep: str = Form(""),
    change: str = Form(""),
    requirements: str = Form(""),
    user=Depends(require_user),
):
    return make_design_plan(
        space_type,
        target_style,
        budget,
        keep,
        change,
        requirements,
    )


@app.post("/api/redesign-preview")
def redesign_preview(
    space_type: str = Form("Room"),
    target_style: str = Form("Modern"),
    budget: int = Form(25000),
    keep: str = Form(""),
    change: str = Form(""),
    requirements: str = Form(""),
    intensity: str = Form("Balanced Redesign"),
    feedback: str = Form(""),
    variation: int = Form(1),
    user=Depends(require_user),
):
    """
    Free preview endpoint.
    It lets the frontend verify exactly what ZYLO will ask the image model
    before spending Stability AI credits.
    """
    instruction = build_redesign_instruction(
        space_type,
        target_style,
        budget,
        keep,
        change,
        requirements,
        intensity,
        feedback,
        variation,
    )

    return {
        "success": True,
        "space_type": space_type,
        "target_style": target_style,
        "budget": max(0, int(budget or 0)),
        "intensity": intensity,
        "variation": max(1, int(variation or 1)),
        "instruction": instruction,
        "generation_ready": bool(STABILITY_API_KEY),
    }


@app.post("/api/redesign-room")
async def redesign_room(
    file: UploadFile = File(...),
    space_type: str = Form("Room"),
    target_style: str = Form("Modern"),
    keep: str = Form(""),
    change: str = Form(""),
    requirements: str = Form(""),
    prompt: str = Form(""),
    budget: int = Form(25000),
    intensity: str = Form("Balanced Redesign"),
    feedback: str = Form(""),
    variation: int = Form(1),
    user=Depends(require_user),
):
    if not STABILITY_API_KEY:
        raise HTTPException(
            503,
            "Stability AI is not configured. You can still build and preview the design plan.",
        )

    credit_account = await to_thread.run_sync(lambda: require_generation_credit(user["id"]))

    content = await file.read()
    validate_uploaded_image(content)

    # Keep backward compatibility with the 2.2 frontend:
    # if the new structured fields are empty, the old prompt is still honored.
    if not any([keep.strip(), change.strip(), requirements.strip()]) and prompt.strip():
        requirements = prompt.strip()

    instruction = build_redesign_instruction(
        space_type,
        target_style,
        budget,
        keep,
        change,
        requirements,
        intensity,
        feedback,
        variation,
    )

    files = {
        "image": (
            file.filename or "room.jpg",
            content,
            file.content_type or "image/jpeg",
        )
    }

    data = {
        "prompt": instruction,
        "model": "sd3.5-large-turbo",
        "mode": "image-to-image",
        # A lower value than 2.2 helps preserve more of the uploaded room.
        "strength": {
            "Light Refresh": "0.38",
            "Balanced Redesign": "0.52",
            "Major Makeover": "0.68",
        }.get(intensity, "0.52"),
        "output_format": "jpeg",
    }

    response = await to_thread.run_sync(
        lambda: requests.post(
            "https://api.stability.ai/v2beta/stable-image/generate/sd3",
            headers={
                "authorization": f"Bearer {STABILITY_API_KEY}",
                "accept": "image/*",
            },
            files=files,
            data=data,
            timeout=180,
        )
    )

    if response.status_code != 200:
        status_code, message = friendly_stability_error(response)
        raise HTTPException(status_code, message)

    encoded = base64.b64encode(response.content).decode("ascii")
    updated_credit_account = await to_thread.run_sync(lambda: consume_generation_credit(user["id"], credit_account))

    return {
        "success": True,
        "image": f"data:image/jpeg;base64,{encoded}",
        "target_style": target_style,
        "space_type": space_type,
        "budget": max(0, int(budget or 0)),
        "preservation_mode": "strong",
        "intensity": intensity,
        "variation": max(1, int(variation or 1)),
        "credits_remaining": int(updated_credit_account.get("balance", 0)),
    }
