from pathlib import Path

import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


# ---------------------------------------------------
# ZYLO CONFIGURATION
# ---------------------------------------------------

app = FastAPI(
    title="ZYLO API",
    description="Backend API for ZYLO AI Interior Design Platform",
    version="1.0.0",
)

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


# ---------------------------------------------------
# MODEL SETTINGS
# ---------------------------------------------------

IMAGE_SIZE = 224

CLASS_NAMES = [
    "boho",
    "industrial",
    "minimalist",
    "modern",
    "scandinavian",
]

# main.py is inside D:\ZYLO\backend
# The model is inside D:\ZYLO\ai
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

MODEL_PATH = (
    PROJECT_DIR
    / "ai"
    / "interior_weights_finetuned.weights.h5"
)


# ---------------------------------------------------
# BUILD ZYLO MODEL
# ---------------------------------------------------

def build_model():
    data_augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.1),
            tf.keras.layers.RandomZoom(0.1),
        ],
        name="data_augmentation",
    )

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        include_top=False,
        weights=None,
    )

    inputs = tf.keras.Input(
        shape=(IMAGE_SIZE, IMAGE_SIZE, 3)
    )

    x = data_augmentation(
        inputs,
        training=False,
    )

    x = tf.keras.layers.Rescaling(
        scale=1.0 / 127.5,
        offset=-1,
    )(x)

    x = base_model(
        x,
        training=False,
    )

    x = tf.keras.layers.GlobalAveragePooling2D()(x)

    x = tf.keras.layers.Dropout(0.3)(x)

    outputs = tf.keras.layers.Dense(
        len(CLASS_NAMES),
        activation="softmax",
    )(x)

    model = tf.keras.Model(
        inputs,
        outputs,
        name="zylo_interior_classifier",
    )

    return model


# ---------------------------------------------------
# LOAD TRAINED WEIGHTS
# ---------------------------------------------------

model = None
model_error = None

try:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}"
        )

    model = build_model()

    model.load_weights(
        MODEL_PATH,
        skip_mismatch=True,
    )

    print("")
    print("======================================")
    print("ZYLO AI MODEL LOADED")
    print(f"Model: {MODEL_PATH}")
    print("Classes:", CLASS_NAMES)
    print("======================================")
    print("")

except Exception as error:
    model_error = str(error)

    print("")
    print("======================================")
    print("ZYLO MODEL LOAD ERROR")
    print(model_error)
    print("======================================")
    print("")


# ---------------------------------------------------
# IMAGE PREPARATION
# ---------------------------------------------------

def prepare_image(image_bytes):
    try:
        image = tf.io.decode_image(
            image_bytes,
            channels=3,
            expand_animations=False,
        )

        image = tf.image.resize(
            image,
            [IMAGE_SIZE, IMAGE_SIZE],
        )

        image = tf.cast(
            image,
            tf.float32,
        )

        image = tf.expand_dims(
            image,
            axis=0,
        )

        return image

    except Exception:
        raise HTTPException(
            status_code=400,
            detail=(
                "ZYLO could not read this image. "
                "Please upload a valid JPG, PNG, or WEBP image."
            ),
        )


# ---------------------------------------------------
# HOME
# ---------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "ZYLO backend is running"
    }


# ---------------------------------------------------
# BACKEND STATUS
# ---------------------------------------------------

@app.get("/api/status")
def status():
    return {
        "status": "online",
        "app": "ZYLO",
        "ai": (
            "connected"
            if model is not None
            else "not_connected"
        ),
        "model_path": str(MODEL_PATH),
        "model_error": model_error,
    }


# ---------------------------------------------------
# BASIC ROOM UPLOAD
# ---------------------------------------------------

@app.post("/api/upload-room")
async def upload_room(
    file: UploadFile = File(...)
):
    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="No file type received",
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file",
        )

    image_data = await file.read()

    if len(image_data) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty",
        )

    max_size = 10 * 1024 * 1024

    if len(image_data) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Image must be smaller than 10 MB",
        )

    return {
        "success": True,
        "message": "Room image received successfully",
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(image_data),
    }


# ---------------------------------------------------
# AI ROOM ANALYSIS
# ---------------------------------------------------

@app.post("/api/analyze-room")
async def analyze_room(
    file: UploadFile = File(...)
):
    if model is None:
        raise HTTPException(
            status_code=500,
            detail=f"ZYLO AI model is not available. {model_error}",
        )

    if not file.content_type:
        raise HTTPException(
            status_code=400,
            detail="No file type received",
        )

    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid room image",
        )

    image_data = await file.read()

    if len(image_data) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty",
        )

    max_size = 10 * 1024 * 1024

    if len(image_data) > max_size:
        raise HTTPException(
            status_code=400,
            detail="Image must be smaller than 10 MB",
        )

    image = prepare_image(image_data)

    predictions = model.predict(
        image,
        verbose=0,
    )[0]

    best_index = int(
        tf.argmax(predictions).numpy()
    )

    predicted_style = CLASS_NAMES[
        best_index
    ]

    confidence = float(
        predictions[best_index]
    )

    all_predictions = {}

    for index, style_name in enumerate(CLASS_NAMES):
        all_predictions[style_name] = round(
            float(predictions[index]) * 100,
            2,
        )

    return {
        "success": True,
        "filename": file.filename,
        "predicted_style": predicted_style,
        "confidence": round(
            confidence * 100,
            2,
        ),
        "predictions": all_predictions,
    }