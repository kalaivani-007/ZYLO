import base64
import os
import re
from pathlib import Path

import requests
import tensorflow as tf
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2


# ============================================================
# ZYLO PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

MODEL_PATH = (
    PROJECT_DIR
    / "ai"
    / "interior_weights_finetuned.weights.h5"
)

ENV_PATH = BASE_DIR / ".env"


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

load_dotenv(ENV_PATH)

STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="ZYLO AI Backend",
    description="AI Interior Design and Visualization Platform",
    version="1.2.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# INTERIOR STYLE CLASSES
# ============================================================

CLASS_NAMES = [
    "boho",
    "industrial",
    "minimalist",
    "modern",
    "scandinavian",
]


# ============================================================
# BUILD STYLE CLASSIFICATION MODEL
# ============================================================

def build_model():
    data_augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.1),
            layers.RandomZoom(0.1),
        ],
        name="data_augmentation",
    )

    base_model = MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights=None,
    )

    model = tf.keras.Sequential(
        [
            layers.Input(shape=(224, 224, 3)),
            data_augmentation,
            layers.Rescaling(
                1.0 / 127.5,
                offset=-1,
            ),
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.Dropout(0.3),
            layers.Dense(
                len(CLASS_NAMES),
                activation="softmax",
            ),
        ]
    )

    return model


model = build_model()


# ============================================================
# LOAD CLASSIFICATION WEIGHTS
# ============================================================

if MODEL_PATH.exists():
    try:
        model.load_weights(
            MODEL_PATH,
            skip_mismatch=True,
        )

        print("\n====================================")
        print("ZYLO AI MODEL LOADED")
        print(f"Model: {MODEL_PATH}")
        print(f"Classes: {CLASS_NAMES}")
        print("====================================\n")

    except Exception as error:
        print("ZYLO MODEL LOAD ERROR:")
        print(error)

else:
    print("\nWARNING:")
    print("ZYLO model weights were not found.")
    print(f"Expected path: {MODEL_PATH}\n")


# ============================================================
# IMAGE VALIDATION
# ============================================================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_SIZE = 10 * 1024 * 1024


async def read_and_validate_image(image: UploadFile):
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload a JPG, JPEG, "
                "PNG or WEBP image."
            ),
        )

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB.",
        )

    return image_bytes


# ============================================================
# STYLE RECOMMENDATION DATA
# ============================================================

STYLE_RECOMMENDATIONS = {
    "boho": {
        "description": (
            "A relaxed, expressive interior style with natural "
            "materials, layered textures and warm earthy colors."
        ),

        "palette": [
            {
                "name": "Terracotta",
                "hex": "#C96B4B",
            },
            {
                "name": "Warm Beige",
                "hex": "#D8C3A5",
            },
            {
                "name": "Olive Green",
                "hex": "#727B4B",
            },
            {
                "name": "Cream",
                "hex": "#F2E8D5",
            },
            {
                "name": "Deep Brown",
                "hex": "#5A3E32",
            },
        ],

        "furniture": [
            "Low-profile fabric sofa with textured cushions",
            "Natural wood or rattan coffee table",
            "Woven lounge chair",
            "Open wooden shelving",
            "Handcrafted side tables",
        ],

        "lighting": [
            "Warm pendant lighting",
            "Rattan or woven lampshades",
            "Soft floor lamps",
            "Warm-white accent lights",
            "Layered ambient lighting",
        ],

        "materials": [
            "Rattan",
            "Natural wood",
            "Linen",
            "Cotton",
            "Jute",
            "Clay",
        ],

        "decor": [
            "Indoor plants",
            "Macrame wall decor",
            "Layered cushions",
            "Patterned rugs",
            "Handmade pottery",
            "Woven baskets",
        ],

        "design_tip": (
            "Use different textures and natural materials, "
            "but keep the colors connected through a warm palette."
        ),
    },

    "industrial": {
        "description": (
            "A bold urban style inspired by converted warehouses, "
            "using exposed materials and darker neutral colors."
        ),

        "palette": [
            {
                "name": "Charcoal",
                "hex": "#343434",
            },
            {
                "name": "Concrete Grey",
                "hex": "#8A8A8A",
            },
            {
                "name": "Rust Brown",
                "hex": "#8B4A2B",
            },
            {
                "name": "Black",
                "hex": "#171717",
            },
            {
                "name": "Warm Wood",
                "hex": "#8B6244",
            },
        ],

        "furniture": [
            "Dark leather or charcoal sofa",
            "Metal-frame coffee table",
            "Wood and steel shelving",
            "Industrial dining chairs",
            "Minimal storage units",
        ],

        "lighting": [
            "Black metal pendant lamps",
            "Track lighting",
            "Exposed-bulb fixtures",
            "Warm Edison-style lighting",
            "Directional wall lights",
        ],

        "materials": [
            "Concrete",
            "Exposed brick",
            "Black steel",
            "Dark wood",
            "Leather",
            "Glass",
        ],

        "decor": [
            "Large wall clock",
            "Black-framed artwork",
            "Metal shelves",
            "Minimal plants",
            "Vintage objects",
            "Industrial sculptures",
        ],

        "design_tip": (
            "Balance darker industrial materials with warm wood "
            "and soft furnishings so the room does not feel cold."
        ),
    },

    "minimalist": {
        "description": (
            "A calm and uncluttered interior focused on functionality, "
            "simple forms and carefully selected objects."
        ),

        "palette": [
            {
                "name": "Soft White",
                "hex": "#F5F5F2",
            },
            {
                "name": "Warm Grey",
                "hex": "#C7C5C1",
            },
            {
                "name": "Light Beige",
                "hex": "#DDD2C2",
            },
            {
                "name": "Taupe",
                "hex": "#A89F91",
            },
            {
                "name": "Black Accent",
                "hex": "#252525",
            },
        ],

        "furniture": [
            "Simple neutral sofa",
            "Clean-lined coffee table",
            "Floating storage units",
            "Minimal accent chair",
            "Functional hidden storage",
        ],

        "lighting": [
            "Recessed ceiling lighting",
            "Simple pendant fixtures",
            "Soft indirect lighting",
            "Linear LED accents",
            "Natural daylight emphasis",
        ],

        "materials": [
            "Light wood",
            "Matte finishes",
            "Glass",
            "Natural stone",
            "Linen",
            "Microcement",
        ],

        "decor": [
            "One or two statement artworks",
            "Simple ceramic objects",
            "Single indoor plant",
            "Neutral rug",
            "Minimal cushions",
            "Clean wall surfaces",
        ],

        "design_tip": (
            "Keep only items that serve a purpose or create a "
            "strong visual contribution to the room."
        ),
    },

    "modern": {
        "description": (
            "A polished contemporary interior with clean geometry, "
            "refined materials and balanced statement features."
        ),

        "palette": [
            {
                "name": "Graphite",
                "hex": "#3D3D42",
            },
            {
                "name": "Warm White",
                "hex": "#F4F1EB",
            },
            {
                "name": "Stone Grey",
                "hex": "#AAA8A3",
            },
            {
                "name": "Walnut",
                "hex": "#755344",
            },
            {
                "name": "Deep Navy",
                "hex": "#26364A",
            },
        ],

        "furniture": [
            "Large contemporary sectional sofa",
            "Statement coffee table",
            "Streamlined media console",
            "Modern accent chair",
            "Built-in storage",
        ],

        "lighting": [
            "Recessed ceiling lighting",
            "Linear LED strips",
            "Statement pendant lights",
            "Warm ambient lighting",
            "Architectural accent lighting",
        ],

        "materials": [
            "Wood veneer",
            "Natural stone",
            "Glass",
            "Metal",
            "Premium fabric",
            "Matte surfaces",
        ],

        "decor": [
            "Large contemporary artwork",
            "Sculptural objects",
            "Indoor statement plant",
            "Geometric rug",
            "Decorative cushions",
            "Modern vases",
        ],

        "design_tip": (
            "Create one strong focal area while keeping the rest "
            "of the room visually balanced and uncluttered."
        ),
    },

    "scandinavian": {
        "description": (
            "A bright, comfortable interior style combining simplicity, "
            "light natural materials and cozy functional design."
        ),

        "palette": [
            {
                "name": "Soft White",
                "hex": "#F6F4EF",
            },
            {
                "name": "Light Oak",
                "hex": "#C9A77B",
            },
            {
                "name": "Warm Grey",
                "hex": "#B9B7B2",
            },
            {
                "name": "Sage Green",
                "hex": "#9AA58D",
            },
            {
                "name": "Charcoal",
                "hex": "#454545",
            },
        ],

        "furniture": [
            "Comfortable light-fabric sofa",
            "Light oak coffee table",
            "Simple wooden lounge chair",
            "Functional open shelving",
            "Compact side tables",
        ],

        "lighting": [
            "Warm pendant lamps",
            "Soft floor lamps",
            "Natural daylight",
            "Warm-white indirect lighting",
            "Simple wall lamps",
        ],

        "materials": [
            "Light oak",
            "Wool",
            "Linen",
            "Cotton",
            "Ceramic",
            "Natural stone",
        ],

        "decor": [
            "Indoor greenery",
            "Neutral cushions",
            "Soft textured rug",
            "Simple wall art",
            "Ceramic vases",
            "Cozy throws",
        ],

        "design_tip": (
            "Keep the room bright and simple while adding enough "
            "soft textures to make the space feel warm and comfortable."
        ),
    },
}


# ============================================================
# USER PROMPT UNDERSTANDING
# ============================================================

COLORS = [
    "black",
    "white",
    "grey",
    "gray",
    "beige",
    "brown",
    "cream",
    "blue",
    "green",
    "red",
    "yellow",
    "orange",
    "purple",
    "pink",
    "gold",
    "silver",
]

OBJECTS = [
    "sofa",
    "couch",
    "chair",
    "chairs",
    "table",
    "coffee table",
    "bed",
    "wardrobe",
    "cabinet",
    "curtains",
    "curtain",
    "rug",
    "carpet",
    "wall",
    "walls",
    "floor",
    "flooring",
    "ceiling",
    "lamp",
    "lights",
    "lighting",
]


def detect_color_object_requirements(user_prompt: str):
    requirements = []
    forbidden = []

    prompt_lower = user_prompt.lower()

    for color in COLORS:
        for obj in OBJECTS:
            direct_pattern = (
                rf"\b{re.escape(color)}\b"
                rf"(?:\s+\w+){{0,3}}\s+"
                rf"\b{re.escape(obj)}\b"
            )

            reverse_pattern = (
                rf"\b{re.escape(obj)}\b"
                rf"(?:\s+\w+){{0,4}}\s+"
                rf"\b{re.escape(color)}\b"
            )

            direct_match = re.search(
                direct_pattern,
                prompt_lower,
            )

            reverse_match = re.search(
                reverse_pattern,
                prompt_lower,
            )

            if direct_match or reverse_match:
                requirement = (
                    f"The {obj} MUST visibly be {color}. "
                    f"This is a mandatory requirement."
                )

                if requirement not in requirements:
                    requirements.append(requirement)

                if obj in [
                    "sofa",
                    "couch",
                    "chair",
                    "chairs",
                    "curtains",
                    "curtain",
                    "rug",
                    "carpet",
                    "bed",
                ]:
                    other_colors = [
                        c
                        for c in COLORS
                        if c != color
                    ]

                    forbidden.append(
                        f"{obj} in "
                        + ", ".join(other_colors[:8])
                    )

    return requirements, forbidden


# ============================================================
# STRICT REDESIGN PROMPT
# ============================================================

def build_redesign_prompt(
    target_style: str,
    user_prompt: str,
):
    mandatory_requirements = []
    forbidden_requirements = []

    detected_requirements, detected_forbidden = (
        detect_color_object_requirements(
            user_prompt
        )
    )

    mandatory_requirements.extend(
        detected_requirements
    )

    forbidden_requirements.extend(
        detected_forbidden
    )

    prompt_lower = user_prompt.lower()

    if (
        "light" in prompt_lower
        or "lighting" in prompt_lower
        or "lights" in prompt_lower
    ):
        mandatory_requirements.append(
            "Lighting changes requested by the user "
            "must be clearly visible in the final image."
        )

    renovation_words = [
        "renovate",
        "renovated",
        "renovation",
        "fully renovated",
        "complete renovation",
        "redesign completely",
    ]

    full_renovation = any(
        word in prompt_lower
        for word in renovation_words
    )

    if full_renovation:
        mandatory_requirements.append(
            "Perform a clearly visible and substantial "
            "interior renovation. Do not make only "
            "minor decorative changes."
        )

    requirements_text = ""

    if mandatory_requirements:
        requirements_text = "\n".join(
            f"- {requirement}"
            for requirement in mandatory_requirements
        )

    prompt = f"""
You are ZYLO, a professional AI interior designer.

TASK:
Redesign the EXACT uploaded room into a beautiful,
photorealistic {target_style} interior.

CRITICAL PRIORITY:
The user's instructions below are MANDATORY.
They are not optional suggestions.

USER'S EXACT REQUEST:
"{user_prompt if user_prompt else "Create an elegant professional redesign."}"

You MUST visually satisfy every reasonable design request
written by the user.

If the user requests:
- a particular furniture item,
  it must appear in the generated room.
- a particular color,
  that color must clearly be used on the requested object.
- new lighting,
  the new lighting must be clearly visible.
- a full renovation,
  the room must look substantially redesigned.
- removal or replacement of an item,
  visibly remove or replace it.

MANDATORY DETECTED REQUIREMENTS:
{requirements_text if requirements_text else "- Follow the user's exact design request."}

ROOM PRESERVATION REQUIREMENTS:
- Preserve the original room identity.
- Preserve the camera viewpoint.
- Preserve the basic room dimensions.
- Preserve major walls.
- Preserve windows.
- Preserve doors.
- Preserve architectural openings.
- Preserve realistic spatial proportions.

DESIGN REQUIREMENTS:
- Apply a clear {target_style} visual language.
- Use realistic furniture.
- Use realistic materials.
- Use physically believable lighting.
- Maintain correct perspective.
- Maintain realistic furniture scale.
- Maintain realistic shadows.
- Create a professional interior design photograph.
- Make the final design clean and coherent.

MOST IMPORTANT:
Do not ignore the user's requested objects,
colors, furniture changes, lighting changes,
materials or renovation instructions.

The final image must visibly demonstrate
that the user's request was followed.
"""

    negative_prompt = """
blurry,
low resolution,
distorted room,
warped walls,
crooked windows,
broken architecture,
bad perspective,
duplicate furniture,
floating furniture,
melting furniture,
deformed objects,
unrealistic furniture,
incorrect proportions,
random objects,
text,
watermark,
logo,
people,
human,
person
"""

    if forbidden_requirements:
        negative_prompt += ", " + ", ".join(
            forbidden_requirements
        )

    return (
        prompt.strip(),
        negative_prompt.strip(),
        full_renovation,
        mandatory_requirements,
    )


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "app": "ZYLO",
        "message": "ZYLO AI backend is running.",
        "version": "1.2.0",
    }


# ============================================================
# BACKEND STATUS
# ============================================================

@app.get("/api/status")
def api_status():
    return {
        "status": "online",
        "service": "ZYLO AI Backend",
        "style_model": MODEL_PATH.exists(),
        "redesign_ai": bool(STABILITY_API_KEY),
        "prompt_engine": "strict-v1",
        "recommendations": True,
    }


# ============================================================
# ROOM UPLOAD TEST
# ============================================================

@app.post("/api/upload-room")
async def upload_room(
    image: UploadFile = File(...),
):
    image_bytes = await read_and_validate_image(
        image
    )

    return {
        "success": True,
        "filename": image.filename,
        "content_type": image.content_type,
        "size_bytes": len(image_bytes),
        "message": "Room image uploaded successfully.",
    }


# ============================================================
# ROOM STYLE ANALYSIS
# ============================================================

@app.post("/api/analyze-room")
async def analyze_room(
    image: UploadFile = File(...),
):
    image_bytes = await read_and_validate_image(
        image
    )

    try:
        decoded_image = tf.io.decode_image(
            image_bytes,
            channels=3,
            expand_animations=False,
        )

        decoded_image = tf.image.resize(
            decoded_image,
            [224, 224],
        )

        decoded_image = tf.cast(
            decoded_image,
            tf.float32,
        )

        decoded_image = tf.expand_dims(
            decoded_image,
            axis=0,
        )

        predictions = model.predict(
            decoded_image,
            verbose=0,
        )[0]

        predicted_index = int(
            tf.argmax(predictions).numpy()
        )

        predicted_style = CLASS_NAMES[
            predicted_index
        ]

        confidence = float(
            predictions[predicted_index]
            * 100
        )

        all_predictions = {}

        for index, style in enumerate(
            CLASS_NAMES
        ):
            all_predictions[style] = round(
                float(
                    predictions[index]
                    * 100
                ),
                2,
            )

        return {
            "success": True,
            "filename": image.filename,
            "predicted_style": predicted_style,
            "confidence": round(
                confidence,
                2,
            ),
            "predictions": all_predictions,
        }

    except Exception as error:
        print("ROOM ANALYSIS ERROR:")
        print(error)

        raise HTTPException(
            status_code=500,
            detail=(
                "ZYLO could not analyze "
                "this room image."
            ),
        )


# ============================================================
# INTERIOR STYLE RECOMMENDATIONS
# ============================================================

@app.post("/api/recommendations")
async def recommendations(
    style: str = Form(...),
):
    style = style.strip().lower()

    if style not in STYLE_RECOMMENDATIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Recommendations are not available "
                "for this interior style."
            ),
        )

    recommendation = STYLE_RECOMMENDATIONS[
        style
    ]

    return {
        "success": True,
        "style": style,
        "description": recommendation[
            "description"
        ],
        "palette": recommendation[
            "palette"
        ],
        "furniture": recommendation[
            "furniture"
        ],
        "lighting": recommendation[
            "lighting"
        ],
        "materials": recommendation[
            "materials"
        ],
        "decor": recommendation[
            "decor"
        ],
        "design_tip": recommendation[
            "design_tip"
        ],
    }


# ============================================================
# AI INTERIOR REDESIGN
# ============================================================

@app.post("/api/redesign-room")
async def redesign_room(
    image: UploadFile = File(...),
    target_style: str = Form(...),
    prompt: str = Form(""),
):
    if not STABILITY_API_KEY:
        raise HTTPException(
            status_code=500,
            detail=(
                "Stability AI API key is missing. "
                "Check backend/.env."
            ),
        )

    image_bytes = await read_and_validate_image(
        image
    )

    target_style = (
        target_style
        .strip()
        .lower()
    )

    user_prompt = prompt.strip()

    allowed_styles = {
        "boho",
        "industrial",
        "minimalist",
        "modern",
        "scandinavian",
    }

    if target_style not in allowed_styles:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please select a valid "
                "interior style."
            ),
        )

    (
        redesign_prompt,
        negative_prompt,
        full_renovation,
        detected_requirements,
    ) = build_redesign_prompt(
        target_style,
        user_prompt,
    )

    if full_renovation:
        image_strength = "0.78"
    else:
        image_strength = "0.68"

    stability_url = (
        "https://api.stability.ai/"
        "v2beta/stable-image/generate/sd3"
    )

    headers = {
        "authorization": (
            f"Bearer "
            f"{STABILITY_API_KEY}"
        ),
        "accept": "image/*",
    }

    file_name = (
        image.filename
        or "room.jpg"
    )

    files = {
        "image": (
            file_name,
            image_bytes,
            image.content_type,
        )
    }

    data = {
        "prompt": redesign_prompt,
        "negative_prompt": negative_prompt,
        "mode": "image-to-image",
        "strength": image_strength,
        "model": "sd3.5-large",
        "output_format": "jpeg",
    }

    print("\n====================================")
    print("ZYLO REDESIGN REQUEST")
    print("Target style:", target_style)
    print("User prompt:", user_prompt)
    print("Strength:", image_strength)
    print(
        "Detected requirements:",
        detected_requirements,
    )
    print("====================================\n")

    try:
        response = requests.post(
            stability_url,
            headers=headers,
            files=files,
            data=data,
            timeout=180,
        )

    except requests.RequestException as error:
        print("STABILITY CONNECTION ERROR:")
        print(error)

        raise HTTPException(
            status_code=503,
            detail=(
                "ZYLO could not connect "
                "to the AI redesign service."
            ),
        )

    if response.status_code != 200:
        print("STABILITY AI ERROR")
        print(
            "Status:",
            response.status_code,
        )
        print(
            "Response:",
            response.text,
        )

        error_message = (
            "AI redesign failed. "
            f"Stability AI returned status "
            f"{response.status_code}."
        )

        try:
            stability_error = response.json()

            if "errors" in stability_error:
                error_message = " ".join(
                    stability_error[
                        "errors"
                    ]
                )

        except Exception:
            pass

        raise HTTPException(
            status_code=response.status_code,
            detail=error_message,
        )

    generated_image_base64 = (
        base64.b64encode(
            response.content
        ).decode("utf-8")
    )

    generated_image_data_url = (
        "data:image/jpeg;base64,"
        + generated_image_base64
    )

    return {
        "success": True,
        "target_style": target_style,
        "prompt": user_prompt,
        "generated_image": (
            generated_image_data_url
        ),
        "requirements_detected": (
            detected_requirements
        ),
        "generation_strength": (
            image_strength
        ),
        "message": (
            "ZYLO AI redesign "
            "generated successfully."
        ),
    }