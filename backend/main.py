import base64
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
MODEL_WEIGHTS_PATH = os.getenv("MODEL_WEIGHTS_PATH", "../ai/interior_weights_finetuned.weights.h5")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the TensorFlow model once at startup so the first user request is fast.
    await to_thread.run_sync(get_model)
    yield


app = FastAPI(title="ZYLO AI API", version="2.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

CLASS_NAMES = ["boho", "industrial", "minimalist", "modern", "scandinavian"]
_model = None
_model_error = None


def build_model():
    import tensorflow as tf
    base = tf.keras.applications.MobileNetV2(input_shape=(224,224,3), include_top=False, weights="imagenet")
    base.trainable = True
    for layer in base.layers[:-20]:
        layer.trainable = False
    inputs = tf.keras.Input(shape=(224,224,3))
    x = tf.keras.layers.Rescaling(1./127.5, offset=-1)(inputs)
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
    response = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_KEY}, timeout=10)
    if response.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")
    return response.json()


def read_image(content: bytes):
    try:
        image = Image.open(io.BytesIO(content)).convert("RGB").resize((224,224))
    except Exception:
        raise HTTPException(400, "Please upload a valid JPG, PNG or WebP image")
    return np.asarray(image, dtype=np.float32)

SPACE_LIBRARY = {
    "Living Room": {"furniture":["comfortable sofa arrangement","nested coffee table","closed media storage"],"lighting":["warm ceiling light","floor lamp near seating","soft accent light"],"materials":["wood","textured fabric","matte metal"],"decor":["large art","rug","indoor plant"]},
    "Bedroom": {"furniture":["storage bed","compact bedside tables","wardrobe organizers"],"lighting":["warm bedside lamps","soft ceiling light","wardrobe task light"],"materials":["cotton or linen","light wood","soft upholstery"],"decor":["curtains","one calming artwork","minimal cushions"]},
    "Kitchen": {"furniture":["drawer organizers","tall pantry storage","compact breakfast ledge where possible"],"lighting":["under-cabinet task light","neutral ceiling light","countertop task light"],"materials":["quartz or durable counter","easy-clean laminate","anti-skid flooring"],"decor":["small herb planters","minimal counter accessories","coordinated jars"]},
    "Balcony": {"furniture":["foldable weather-safe chairs","compact bench","vertical plant rack"],"lighting":["warm wall lights","solar accent lights","soft string lights"],"materials":["weather-safe wood composite","outdoor fabric","anti-skid tile"],"decor":["vertical greenery","planters","small outdoor rug"]},
    "Staircase": {"furniture":["under-stair storage","slim console if space permits","wall-mounted shelf"],"lighting":["step lights","wall sconces","landing pendant"],"materials":["wood accents","metal railing","textured wall finish"],"decor":["gallery wall","single statement artwork","indoor plant at landing"]},
    "Bathroom": {"furniture":["floating vanity","mirror cabinet","niche storage"],"lighting":["mirror task light","moisture-safe ceiling light","soft ambient light"],"materials":["anti-skid tile","moisture-safe laminate","stone-look surfaces"],"decor":["minimal bottles","small humidity-safe plant","neutral towels"]},
    "Dining Room": {"furniture":["correctly scaled dining table","comfortable dining chairs","slim crockery storage"],"lighting":["centered pendant","warm ambient light","buffet accent light"],"materials":["durable wood finish","washable upholstery","easy-clean flooring"],"decor":["simple centerpiece","wall art","textured runner"]},
    "Study / Office": {"furniture":["ergonomic desk","supportive chair","closed document storage"],"lighting":["glare-free task lamp","neutral ceiling light","indirect shelf light"],"materials":["matte worktop","acoustic textile","light wood"],"decor":["pinboard","small plant","minimal desk accessories"]},
    "Kids Room": {"furniture":["rounded-edge storage","flexible study desk","accessible toy storage"],"lighting":["soft ceiling light","study task lamp","night light"],"materials":["washable paint","durable laminate","soft rug"],"decor":["display shelf","removable wall graphics","storage baskets"]},
    "Terrace": {"furniture":["weather-safe lounge seating","compact outdoor table","movable planters"],"lighting":["weather-rated wall lights","path lights","soft ambient strings"],"materials":["outdoor tile","powder-coated metal","UV-resistant fabric"],"decor":["planter groups","shade element","outdoor rug"]},
    "Entrance / Foyer": {"furniture":["slim shoe storage","small console","wall hooks"],"lighting":["warm ceiling light","mirror accent light","entry wall sconce"],"materials":["durable flooring","wood accent","easy-clean wall finish"],"decor":["mirror","key tray","single plant"]},
    "Outdoor / Garden": {"furniture":["weather-safe seating","outdoor table","storage bench"],"lighting":["path lighting","wall lighting","plant uplights"],"materials":["outdoor pavers","weather-safe metal","UV-resistant fabric"],"decor":["layered planting","planters","defined pathway"]},
}

STYLE_COLORS = {
    "Modern":["Warm White","Charcoal","Walnut","Muted Gold"],
    "Minimalist":["Soft White","Warm Grey","Light Oak","Black Accent"],
    "Scandinavian":["Off White","Light Oak","Sage","Dusty Blue"],
    "Industrial":["Concrete Grey","Matte Black","Rust Brown","Warm Wood"],
    "Boho":["Cream","Terracotta","Olive","Natural Rattan"]
}


SPACE_GOALS = {
    "Living Room": ["Improve conversation seating", "Create a cleaner TV wall", "Add concealed storage"],
    "Bedroom": ["Improve sleep-friendly lighting", "Increase wardrobe/storage efficiency", "Keep circulation around the bed clear"],
    "Kitchen": ["Improve counter workflow", "Increase closed storage", "Prioritize easy-clean and heat-safe finishes"],
    "Dining Room": ["Center the dining zone", "Use comfortable circulation clearance", "Add focused pendant lighting"],
    "Study / Office": ["Create an ergonomic work zone", "Control screen glare", "Add cable and document storage"],
    "Kids Room": ["Use flexible storage", "Keep play circulation safe", "Choose durable easy-clean finishes"],
    "Balcony": ["Use weather-safe furniture", "Add greenery without blocking circulation", "Create soft evening lighting"],
    "Staircase": ["Improve step safety and lighting", "Use vertical wall space", "Use under-stair volume efficiently"],
    "Bathroom": ["Improve moisture-safe storage", "Prioritize anti-skid surfaces", "Add strong mirror/task lighting"],
    "Terrace": ["Create shaded seating", "Use weather-resistant materials", "Plan low-maintenance greenery"],
    "Entrance / Foyer": ["Create a clear arrival zone", "Add shoe/key storage", "Use one strong visual focal point"],
    "Outdoor / Garden": ["Define seating and planting zones", "Use outdoor-rated lighting", "Keep pathways clear and durable"],
}

def make_design_plan(space_type: str, target_style: str, budget: int, keep: str = "", change: str = "", requirements: str = ""):
    base = SPACE_LIBRARY.get(space_type, SPACE_LIBRARY["Living Room"])
    budget = max(0, int(budget or 0))
    keep_items = [x.strip() for x in keep.replace("\n", ",").split(",") if x.strip()]
    change_items = [x.strip() for x in change.replace("\n", ",").split(",") if x.strip()]
    goals = SPACE_GOALS.get(space_type, ["Preserve circulation", "Improve storage", "Use practical lighting"])
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
            "furniture": round(budget*.40),
            "materials": round(budget*.22),
            "lighting": round(budget*.13),
            "decor": round(budget*.15),
            "buffer": round(budget*.10),
        },
        "tip": f"For this {space_type.lower()}, preserve the items marked Keep first, then spend on the Change list and the highest-impact {target_style.lower()} upgrades."
    }

@app.get("/")
def root(): return {"name":"ZYLO AI API","version":"2.2.0"}

@app.get("/api/status")
def status():
    return {"status":"online","style_model":"ready" if get_model() is not None else "missing","model_error":_model_error,"redesign_ai":"configured" if STABILITY_API_KEY else "not configured","whole_house":"ready","recommendations":"ready"}

@app.post("/api/analyze-room")
async def analyze_room(file: UploadFile = File(...), space_type: str = Form("Room"), user=Depends(require_user)):
    model = get_model()
    if model is None: raise HTTPException(503, _model_error or "Style model unavailable")
    content = await file.read()
    array = read_image(content)
    preds = await to_thread.run_sync(lambda: model.predict(np.expand_dims(array,0), verbose=0)[0])
    idx = int(np.argmax(preds))
    return {"success":True,"space_type":space_type,"predicted_style":CLASS_NAMES[idx],"confidence":round(float(preds[idx])*100,2),"predictions":{name:round(float(preds[i])*100,2) for i,name in enumerate(CLASS_NAMES)}}

@app.get("/api/recommendations")
def recommendations(space_type: str = "Living Room", target_style: str = "Modern", budget: int = 25000, user=Depends(require_user)):
    return make_design_plan(space_type, target_style, budget)

@app.post("/api/design-plan")
def design_plan(space_type: str = Form("Living Room"), target_style: str = Form("Modern"), budget: int = Form(25000), keep: str = Form(""), change: str = Form(""), requirements: str = Form(""), user=Depends(require_user)):
    return make_design_plan(space_type, target_style, budget, keep, change, requirements)

@app.post("/api/redesign-room")
async def redesign_room(file: UploadFile = File(...), space_type: str = Form("Room"), target_style: str = Form("Modern"), prompt: str = Form(""), budget: int = Form(25000), user=Depends(require_user)):
    if not STABILITY_API_KEY: raise HTTPException(503, "Stability AI key is not configured")
    content = await file.read()
    instruction = f"Interior redesign of the exact uploaded {space_type}. Preserve architecture, camera angle, doors, windows and structural layout. Target style: {target_style}. User requirements: {prompt}. Budget-aware and realistic, practical furniture scale, professional interior photography, no people, no text, no logos."
    files = {"image": (file.filename or "room.jpg", content, file.content_type or "image/jpeg")}
    data = {"prompt":instruction,"model":"sd3.5-large","mode":"image-to-image","strength":"0.65","output_format":"jpeg"}
    response = await to_thread.run_sync(lambda: requests.post("https://api.stability.ai/v2beta/stable-image/generate/sd3", headers={"authorization":f"Bearer {STABILITY_API_KEY}","accept":"image/*"}, files=files, data=data, timeout=180))
    if response.status_code != 200:
        detail = response.text[:500]
        raise HTTPException(response.status_code, f"AI redesign failed: {detail}")
    encoded = base64.b64encode(response.content).decode("ascii")
    return {"success":True,"image":f"data:image/jpeg;base64,{encoded}","target_style":target_style,"space_type":space_type,"budget":budget}
