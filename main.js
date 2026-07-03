// ================= IMPORTS =================
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import Groq from "groq-sdk";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs/promises";
import { createReadStream } from "fs";

dotenv.config();

// ================= APP SETUP =================
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "25mb" }));
app.use(bodyParser.urlencoded({ limit: "25mb", extended: true }));

// ================= PATH FIX (IMPORTANT) =================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_PATH = path.join(__dirname, "log.json");

// ================= SERVE FRONTEND =================
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= GROQ CONFIG =================
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const rawKey = String(process.env.GROQ_API_KEY || "").trim();
if (!rawKey || rawKey === "YOUR_GROQ_API_KEY") {
  console.error("GROQ_API_KEY is missing or placeholder in .env");
  process.exit(1);
}
const AZURE_SPEECH_KEY = String(process.env.AZURE_SPEECH_KEY || "").trim();
const AZURE_SPEECH_REGION = String(process.env.AZURE_SPEECH_REGION || "").trim();

// ================= MEMORY =================
let sensorHistory = [];
let notifications = [];
const TEXT_MODEL_CANDIDATES = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
];
const VISION_MODEL_CANDIDATES = [
  "meta-llama/llama-4-scout-17b-16e-instruct"
];
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
let groqModelCache = {
  ids: null,
  fetchedAt: 0
};

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimList(list, max = 100) {
  if (list.length > max) {
    list.splice(0, list.length - max);
  }
}

function createNotification({
  msg,
  details = "",
  kind = "alert",
  source = "system",
  undoable = false,
  linkedAnalysisId = null
}) {
  const entry = {
    id: makeId("notif"),
    msg,
    details,
    kind,
    source,
    undoable,
    linkedAnalysisId,
    time: new Date()
  };

  notifications.push(entry);
  trimList(notifications, 150);
  return entry;
}

function parseAnalysisResult(result = "") {
  const lines = String(result)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const actionLine = lines.find(line => /^Action\s*:/i.test(line));
  const reasonLine = lines.find(line => /^Reason\s*:/i.test(line));

  return {
    action: actionLine ? actionLine.replace(/^Action\s*:\s*/i, "").trim() : "",
    reason: reasonLine ? reasonLine.replace(/^Reason\s*:\s*/i, "").trim() : ""
  };
}

async function getAvailableGroqModelIds() {
  const now = Date.now();
  if (groqModelCache.ids && now - groqModelCache.fetchedAt < MODEL_CACHE_TTL_MS) {
    return groqModelCache.ids;
  }

  const models = await client.models.list();
  const ids = new Set((models?.data || []).map(item => item.id).filter(Boolean));
  groqModelCache = {
    ids,
    fetchedAt: now
  };
  return ids;
}

async function getModelCandidates(wantsVision = false) {
  const preferred = wantsVision ? VISION_MODEL_CANDIDATES : TEXT_MODEL_CANDIDATES;

  try {
    const availableIds = await getAvailableGroqModelIds();
    const supported = preferred.filter(model => availableIds.has(model));
    if (supported.length > 0) {
      return supported;
    }
  } catch (err) {
    console.warn("Could not refresh Groq model list, using static fallback:", err?.message || err);
  }

  return preferred;
}

function sanitizeChatContent(content) {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed ? trimmed : null;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const parts = content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return null;
      }

      if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        return { type: "text", text: part.text.trim() };
      }

      const imageUrl = part?.image_url?.url;
      if (part.type === "image_url" && typeof imageUrl === "string" && imageUrl.startsWith("data:image/")) {
        return {
          type: "image_url",
          image_url: { url: imageUrl }
        };
      }

      return null;
    })
    .filter(Boolean);

  return parts.length > 0 ? parts : null;
}

function sanitizeHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .slice(-16)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
      const content = sanitizeChatContent(item.content);
      if (!role || !content) {
        return null;
      }

      return { role, content };
    })
    .filter(Boolean);
}

function historyContainsImage(messages = []) {
  return messages.some((message) =>
    Array.isArray(message.content) &&
    message.content.some((part) => part?.type === "image_url" && typeof part?.image_url?.url === "string")
  );
}

async function createGroqChatCompletion({ messages, wantsVision }) {
  const modelCandidates = await getModelCandidates(wantsVision);
  let lastErr = null;

  for (const model of modelCandidates) {
    try {
      return await client.chat.completions.create({
        model,
        messages,
        temperature: 0.6,
        max_tokens: wantsVision ? 1024 : 900
      });
    } catch (err) {
      lastErr = err;
      const errorCode = err?.error?.code || err?.code || "";
      const errorMessage = String(err?.error?.message || err?.message || "");
      const retryableModelError =
        errorCode === "model_decommissioned" ||
        errorCode === "model_not_found" ||
        /decommissioned|no longer supported|not found|unsupported/i.test(errorMessage);

      if (retryableModelError) {
        console.warn(`Groq model ${model} unavailable, trying next candidate.`);
        groqModelCache.fetchedAt = 0;
        continue;
      }

      throw err;
    }
  }

  throw lastErr || new Error("No Groq model is currently available for this request.");
}

// ================= CHAT API =================
app.post("/chat", async (req, res) => {
  try {
    const { message, imageBase64, languageCode, farmerContext, history } = req.body;
    const hasImage = typeof imageBase64 === "string" && imageBase64.startsWith("data:image/");
    const requestedLang = String(languageCode || "en-IN").trim();
    const languageNames = {
      "en-IN": "English",
      "hi-IN": "Hindi",
      "ta-IN": "Tamil",
      "te-IN": "Telugu",
      "kn-IN": "Kannada",
      "ml-IN": "Malayalam",
      "gu-IN": "Gujarati",
      "mr-IN": "Marathi",
      "bn-IN": "Bengali",
      "pa-IN": "Punjabi",
      "ur-PK": "Urdu",
      "de-DE": "German",
      "fr-FR": "French",
      "es-ES": "Spanish",
      "it-IT": "Italian",
      "pt-PT": "Portuguese",
      "ru-RU": "Russian",
      "zh-CN": "Chinese",
      "ja-JP": "Japanese",
      "ko-KR": "Korean",
      "ar-SA": "Arabic",
      "tr-TR": "Turkish",
      "nl-NL": "Dutch",
      "pl-PL": "Polish",
      "sv-SE": "Swedish",
      "no-NO": "Norwegian",
      "da-DK": "Danish",
      "fi-FI": "Finnish",
      "cs-CZ": "Czech",
      "el-GR": "Greek",
      "he-IL": "Hebrew",
      "th-TH": "Thai",
      "vi-VN": "Vietnamese",
      "id-ID": "Indonesian",
      "ms-MY": "Malay",
      "uk-UA": "Ukrainian",
      "ro-RO": "Romanian",
      "hu-HU": "Hungarian"
    };
    const targetLanguage = languageNames[requestedLang] || requestedLang;
    const systemInstruction = `You are an expert agriculture assistant for Indian farmers. Reply ONLY in ${targetLanguage}. Keep answers practical, clear, and short with steps when relevant.`;

    const sanitizedHistory = sanitizeHistory(history);
    const fallbackUserContent = hasImage
      ? [
        {
          type: "text",
          text:
            message ||
            "Analyze this farm image. Identify crop/weed/disease/pest signs if any, and give clear treatment steps."
        },
        {
          type: "image_url",
          image_url: { url: imageBase64 }
        }
      ]
      : (message || "Help me with my farm.");

    const messages = [
      { role: "system", content: systemInstruction }
    ];

    if (typeof farmerContext === "string" && farmerContext.trim()) {
      messages.push({
        role: "system",
        content: `Farmer profile context: ${farmerContext.trim()}`
      });
    }

    messages.push(
      ...(sanitizedHistory.length > 0
        ? sanitizedHistory
        : [{ role: "user", content: fallbackUserContent }])
    );

    const response = await createGroqChatCompletion({
      messages,
      wantsVision: historyContainsImage(messages)
    });

    const reply = response?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({
        error: "Model returned an empty response for this image. Try a clearer image or smaller file."
      });
    }

    res.json({
      reply
    });

  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err?.message || "Chat failed" });
  }
});

// ================= SENSOR ANALYSIS =================
app.post("/sensor-analysis", async (req, res) => {
  try {
    const { readings } = req.body;

    const formattedData = readings.map(r =>
      `Temp:${r[1]} Hum:${r[2]} Soil:${r[3]} Rain:${r[4]}`
    ).join("\n");

    const prompt = `
You are an expert agriculture AI.

Sensor Data:
${formattedData}

Analyse:
- Soil condition
- Risk level
- Farm health

Respond EXACTLY like:
Health: <Good/Moderate/Critical>
Reason: <short reason>
Action: <what farmer should do>
`;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5
    });

    const result = response.choices[0].message.content;
    const parsed = parseAnalysisResult(result);

    const entry = {
      id: makeId("analysis"),
      time: new Date(),
      result
    };

    sensorHistory.push(entry);
    trimList(sensorHistory, 100);

    createNotification({
      msg: parsed.action || "New 1-minute farm suggestion is ready.",
      details: result,
      kind: "sensor-suggestion",
      source: "sensor-analysis",
      undoable: true,
      linkedAnalysisId: entry.id
    });

    const last = readings[readings.length - 1];
    const soil = parseInt(last[3]);
    const rain = parseInt(last[4]);
    const temp = parseFloat(last[1]);
    const hum = parseFloat(last[2]);

    if (soil === 1) {
      createNotification({
        msg: "Soil is dry. Irrigation is needed.",
        kind: "alert",
        source: "sensor-rule"
      });
    }

    if (rain > 60) {
      createNotification({
        msg: "Heavy rain detected. Stop irrigation.",
        kind: "alert",
        source: "sensor-rule"
      });
    }

    if (temp > 35) {
      createNotification({
        msg: "High temperature detected.",
        kind: "alert",
        source: "sensor-rule"
      });
    }

    if (hum < 30) {
      createNotification({
        msg: "Low humidity detected. There is a dryness risk.",
        kind: "alert",
        source: "sensor-rule"
      });
    }

    res.json({ result });

  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI failed" });
  }
});

// ================= GET ANALYSIS =================
app.get("/sensor-history", (req, res) => {
  res.json(sensorHistory);
});

// ================= GET ALERTS =================
app.get("/notifications", (req, res) => {
  res.json(notifications.slice(-20));
});

app.post("/notifications/:id/undo", (req, res) => {
  const { id } = req.params;
  const idx = notifications.findIndex(item => item.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const [removed] = notifications.splice(idx, 1);

  res.json({
    ok: true,
    removedId: id,
    linkedAnalysisId: removed.linkedAnalysisId || null
  });
});

// ================= WEATHER ALERT =================
app.get("/weather-alert", (req, res) => {
  try {
    const weatherMsg = "No rain expected today.";
    res.json({ msg: weatherMsg });

  } catch (err) {
    console.error("Weather error:", err);
    res.status(500).json({ error: "Weather failed" });
  }
});


// ================= LATEST FARM WEALTH =================
app.get("/farm-wealth", async (req, res) => {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    let entries;
    try {
      entries = JSON.parse(raw);
    } catch {
      // Backward compatibility: older log.json may contain bare NaN tokens.
      entries = JSON.parse(raw.replace(/\bNaN\b/g, "\"NaN\""));
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.json({ farmWealth: null, timestamp: null, average: null });
    }

    const last = entries[entries.length - 1];
    res.json({
      farmWealth: last.farm_wealth ?? null,
      timestamp: last.timestamp ?? null,
      average: last.average ?? null,
      windowSeconds: last.window_seconds ?? 10
    });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.json({ farmWealth: null, timestamp: null, average: null });
    }
    console.error("Farm wealth read error:", err);
    res.status(500).json({ error: "Failed to read farm wealth log" });
  }
});

// ================= FARM WEALTH HISTORY =================
app.get("/farm-wealth/history", async (req, res) => {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf-8");
    let entries;
    try {
      entries = JSON.parse(raw);
    } catch {
      entries = JSON.parse(raw.replace(/\bNaN\b/g, "\"NaN\""));
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.json({ items: [] });
    }

    const items = entries
      .slice(-20)
      .reverse()
      .map((x) => ({
        timestamp: x.timestamp ?? null,
        average: x.average ?? null
      }));

    res.json({ items });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.json({ items: [] });
    }
    console.error("Farm wealth history read error:", err);
    res.status(500).json({ error: "Failed to read farm wealth history" });
  }
});

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pickAzureVoice(languageCode = "en-IN") {
  const voices = {
    "en-IN": "en-IN-NeerjaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
    "ta-IN": "ta-IN-PallaviNeural",
    "te-IN": "te-IN-ShrutiNeural",
    "kn-IN": "kn-IN-SapnaNeural",
    "ml-IN": "ml-IN-SobhanaNeural",
    "gu-IN": "gu-IN-DhwaniNeural",
    "mr-IN": "mr-IN-AarohiNeural",
    "bn-IN": "bn-IN-TanishaaNeural",
    "pa-IN": "pa-IN-VaaniNeural",
    "ur-PK": "ur-PK-UzmaNeural",
    "de-DE": "de-DE-KatjaNeural",
    "fr-FR": "fr-FR-DeniseNeural",
    "es-ES": "es-ES-ElviraNeural",
    "it-IT": "it-IT-ElsaNeural",
    "pt-PT": "pt-PT-RaquelNeural",
    "ru-RU": "ru-RU-SvetlanaNeural",
    "zh-CN": "zh-CN-XiaoxiaoNeural",
    "ja-JP": "ja-JP-NanamiNeural",
    "ko-KR": "ko-KR-SunHiNeural",
    "ar-SA": "ar-SA-ZariyahNeural",
    "tr-TR": "tr-TR-EmelNeural",
    "nl-NL": "nl-NL-ColetteNeural",
    "pl-PL": "pl-PL-ZofiaNeural",
    "sv-SE": "sv-SE-SofieNeural",
    "no-NO": "nb-NO-PernilleNeural",
    "da-DK": "da-DK-ChristelNeural",
    "fi-FI": "fi-FI-NooraNeural",
    "cs-CZ": "cs-CZ-VlastaNeural",
    "el-GR": "el-GR-AthinaNeural",
    "he-IL": "he-IL-HilaNeural",
    "th-TH": "th-TH-PremwadeeNeural",
    "vi-VN": "vi-VN-HoaiMyNeural",
    "id-ID": "id-ID-GadisNeural",
    "ms-MY": "ms-MY-YasminNeural",
    "uk-UA": "uk-UA-PolinaNeural",
    "ro-RO": "ro-RO-AlinaNeural",
    "hu-HU": "hu-HU-NoemiNeural"
  };
  return voices[languageCode] || "en-US-AvaMultilingualNeural";
}

async function synthesizeAzureSpeech({ text, languageCode }) {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error("Azure Speech credentials are missing in .env");
  }

  const lang = String(languageCode || "en-IN").trim();
  const safeText = String(text || "").trim().slice(0, 4000);
  if (!safeText) {
    throw new Error("No text provided for speech synthesis");
  }

  const voicesToTry = [pickAzureVoice(lang), "en-US-AvaMultilingualNeural"];
  const endpoint = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  let lastErr = null;

  for (const voiceName of voicesToTry) {
    const ssml = `<speak version="1.0" xml:lang="${lang}"><voice name="${voiceName}">${escapeXml(safeText)}</voice></speak>`;

    const azureRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "smart-farming-dashboard"
      },
      body: ssml
    });

    if (azureRes.ok) {
      const arrayBuffer = await azureRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    const reason = await azureRes.text();
    lastErr = new Error(`Azure TTS failed (${azureRes.status}) with voice ${voiceName}: ${reason}`);
  }

  throw lastErr || new Error("Azure TTS failed");
}

// ================= AZURE TTS =================
app.post("/azure-tts", async (req, res) => {
  try {
    const { text, languageCode } = req.body || {};
    const audioBuffer = await synthesizeAzureSpeech({ text, languageCode });
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audioBuffer);
  } catch (err) {
    console.error("Azure TTS error:", err);
    res.status(500).json({ error: err?.message || "Azure TTS failed" });
  }
});

function languageToWhisperCode(languageCode) {
  const lang = String(languageCode || "en-IN").trim().toLowerCase();
  const [base] = lang.split("-");
  return base || "en";
}

// ================= SERVER STT (MIC FALLBACK) =================
app.post("/stt", async (req, res) => {
  try {
    const { audioBase64, mimeType, languageCode } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== "string" || !audioBase64.includes(",")) {
      return res.status(400).json({ error: "audioBase64 is required" });
    }

    const base64Data = audioBase64.split(",")[1];
    const audioBuffer = Buffer.from(base64Data, "base64");
    if (!audioBuffer.length) {
      return res.status(400).json({ error: "Invalid audio payload" });
    }

    const safeMime = String(mimeType || "audio/webm").split(";")[0].trim() || "audio/webm";
    const extensionMap = {
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/wav": "wav"
    };
    const ext = extensionMap[safeMime] || "webm";
    const tmpPath = path.join(__dirname, `tmp-stt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`);
    await fs.writeFile(tmpPath, audioBuffer);

    let transcriptResp;
    try {
      transcriptResp = await client.audio.transcriptions.create({
        file: createReadStream(tmpPath),
        model: "whisper-large-v3-turbo",
        language: languageToWhisperCode(languageCode),
        temperature: 0
      });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }

    const text = String(transcriptResp?.text || "").trim();
    if (!text) {
      return res.status(422).json({ error: "No speech detected in audio" });
    }

    return res.json({ transcript: text });
  } catch (err) {
    console.error("STT error:", err);
    return res.status(500).json({ error: err?.message || "Speech-to-text failed" });
  }
});

// ================= START SERVER =================
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
