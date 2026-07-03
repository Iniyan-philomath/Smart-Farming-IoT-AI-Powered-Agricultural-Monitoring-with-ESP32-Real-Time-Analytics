from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from io import BytesIO
import os

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

app = FastAPI(title="Smart Farming Assistant")

class FarmDetails(BaseModel):
    farm_id: str
    farmer_name: str
    village: str
    state: str
    area_acres: float
    crops: List[str]
    sensors: Dict[str, float]

class DiagnoseRequest(BaseModel):
    farmer_id: str
    crop: str
    issue_description: str

class ChatRequest(BaseModel):
    farmer_id: str
    message: str
    language: Optional[str] = "en"

# Sample in-memory data for demo. Replace with DB in production.
FARMERS = {
    "F001": FarmDetails(
        farm_id="F001",
        farmer_name="Ravi Kumar",
        village="Nandurbar",
        state="Maharashtra",
        area_acres=2.5,
        crops=["Tomato", "Chilli"],
        sensors={"soil_moisture": 30.7, "air_temp": 32.0, "humidity": 62.5},
    ),
    "F002": FarmDetails(
        farm_id="F002",
        farmer_name="Meena Devi",
        village="Bijnor",
        state="Uttar Pradesh",
        area_acres=1.8,
        crops=["Wheat", "Mustard"],
        sensors={"soil_moisture": 42.3, "air_temp": 28.5, "humidity": 55.1},
    ),
}

SCHEMES = [
    {"name": "PM-KISAN", "details": "₹6000/year for small and marginal farmers"},
    {"name": "Pradhan Mantri Fasal Bima Yojana", "details": "Crop insurance for risk mitigation"},
    {"name": "Soil Health Card", "details": "Free soil testing and recommendations"},
]

CROP_ISSUE_KNOWLEDGE = {
    "white holes": "This may happen due to pest damage (e.g., beetles) or nutrient deficiency. Check for insects and adjust micronutrients.",
    "yellow leaves": "Could be nitrogen deficiency or over-watering. Verify soil N and moisture.",
    "wilt": "May indicate vascular wilt disease or water stress. Inspect root system and soil moisture levels.",
}

@app.get("/")
def home():
    return {"message": "Smart Farming AI is Running 🚀"}

@app.get("/scheme")
def get_schemes():
    return {"schemes": SCHEMES}

@app.get("/scheme/recommend/{farmer_id}")
def recommend_scheme(farmer_id: str):
    farmer = FARMERS.get(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    recs = [s for s in SCHEMES if s["name"] in ["PM-KISAN", "Soil Health Card"]]
    return {"farmer_id": farmer_id, "eligible_schemes": recs}

@app.get("/farmer/{farmer_id}")
def get_farmer(farmer_id: str):
    farmer = FARMERS.get(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return farmer

@app.get("/farm/{farmer_id}/digital-twin")
def digital_twin(farmer_id: str):
    farmer = FARMERS.get(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    return {
        "farm_id": farmer.farm_id,
        "status": "active",
        "area_acres": farmer.area_acres,
        "crop_list": farmer.crops,
        "sensor_snapshot": farmer.sensors,
        "recommendation": "Soil moisture low, irrigate today; consider foliar spray for improved crop health." ,
    }

@app.post("/diagnose")
def diagnose(req: DiagnoseRequest):
    suggestion_key = req.issue_description.lower().strip()
    suggestion = CROP_ISSUE_KNOWLEDGE.get(suggestion_key)
    if not suggestion:
        suggestion = "Please upload a photo and consult local agriculture extension officer. Could be pest/disease or nutrient issue."
    return {
        "farmer_id": req.farmer_id,
        "crop": req.crop,
        "issue_description": req.issue_description,
        "diagnosis": suggestion,
    }

@app.post("/upload-image")
def upload_image(farmer_id: str = Form(...), file: UploadFile = File(...)):
    filename = f"uploads/{farmer_id}_{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(filename, "wb") as f:
        f.write(file.file.read())

    return {"farmer_id": farmer_id, "file_saved": filename, "message": "Image received, analysis pending."}

@app.post("/chat")
def chat(req: ChatRequest):
    # For now, simple rule-based responses; integrate OpenAI API in production.
    message = req.message.lower()
    if "scheme" in message:
        return {"response": "You are eligible for PM-KISAN and Soil Health Card. For details, use /scheme/recommend/{farmer_id}."}
    if "white holes" in message or "holes" in message:
        return {"response": CROP_ISSUE_KNOWLEDGE.get("white holes")}

    return {"response": "सही जानकारी के लिए कृपया पत्ते का फोटो और कृपया स्थानीय कृषक सलाहकार से सलाह लें।"}

@app.post("/tts")
def tts(text: str = Form(...), lang: Optional[str] = Form("en")):
    if not gTTS:
        raise HTTPException(status_code=503, detail="gtts package is not installed")

    tts_obj = gTTS(text=text, lang=lang)
    buffer = BytesIO()
    tts_obj.write_to_fp(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="audio/mpeg")
