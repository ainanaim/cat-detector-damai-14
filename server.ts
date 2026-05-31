import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Increase payload limits for base64 photo uploads from the Raspberry Pi
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Shared Gemini AI setup
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// In-Memory Database for Cat Detections and Pi Logs
interface CatLog {
  id: string;
  timestamp: string;
  state: "SUCCESS" | "FALSE_ALARM";
  confidence: number;
  mediaUrl: string;
  logMessage: string;
  cpu_speed_mhz: number;
  behaviorAnalysis?: {
    title: string;
    thoughts: string;
    intensity: "Low" | "Medium" | "High";
    recommendations: string;
  };
}

// Seed with some playful pre-loaded logs so the dashboard is immediately populated
const preloadedLogs: CatLog[] = [
  {
    id: "log_1",
    timestamp: new Date(Date.now() - 36 * 60000).toISOString(), // 36 mins ago
    state: "SUCCESS",
    confidence: 0.89,
    mediaUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600",
    logMessage: "PIR motion detected at floor height. YOLOv8 Class 15 (cat) matched with 89% confidence. Argon One fan kicked in at 45% level. 5s clip recorded.",
    cpu_speed_mhz: 2400,
    behaviorAnalysis: {
      title: "Midnight Zoomies Standoff",
      thoughts: "I smelled a ghost under the sofa. Suddenly, that box on the wall clicked and did a night-vision glow. It is containing either chicken or the laser-pointer master. I must stare until it yields.",
      intensity: "High",
      recommendations: "NoIR camera exposure is great. Your Pi 5 is currently running at 2.4 GHz under full load, thermals look fine (48°C). Keep camera height at 15cm from floor to better monitor stalking behavior."
    }
  },
  {
    id: "log_2",
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(), // 2 hours ago
    state: "FALSE_ALARM",
    confidence: 0.12,
    mediaUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600",
    logMessage: "PIR heat trigger registered. YOLOv8 scan executed. Matched canine elements, but cat confidence 12% is below threshold (60%). CPU frequency dropped back to 1.5 GHz after 5s. No video recorded.",
    cpu_speed_mhz: 1500
  },
  {
    id: "log_3",
    timestamp: new Date(Date.now() - 240 * 60000).toISOString(), // 4 hours ago
    state: "SUCCESS",
    confidence: 0.94,
    mediaUrl: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600",
    logMessage: "PIR sensor detected consistent thermal signature near feeding station. YOLOv8 Class 15 (cat) matched with 94% confidence. Night exposure balance activated.",
    cpu_speed_mhz: 2400,
    behaviorAnalysis: {
      title: "Gourmet Assessment Ritual",
      thoughts: "The dry nuggets of sustenance are still here. They lack freshness. Why does this tiny black camera box spy on my disappointment? I will register my formal protest with a long gaze.",
      intensity: "Medium",
      recommendations: "Perfect detection. Confidence is highly stable. The lighting seems ideal for the NoIR sensor without external IR support. Argon One cooling remains minimal (passive mode)."
    }
  }
];

let databaseLogs: CatLog[] = [...preloadedLogs];

// API: Get all logs
app.get("/api/logs", (req, res) => {
  res.json({ logs: databaseLogs });
});

// API: Setup variables check
app.get("/api/config-status", (req, res) => {
  const expectedToken = process.env.PI_API_TOKEN || "catcam_secret_token_2026";
  res.json({
    hasGemini: !!ai,
    apiKeyConfigured: (!!apiKey && apiKey !== "MY_GEMINI_API_KEY"),
    apiToken: expectedToken,
  });
});

// API: Save settings or push a new log directly from the Pi
app.post("/api/upload", (req, res) => {
  const receivedToken = req.headers["x-api-token"] || 
                        req.headers["x-pi-token"] ||
                        (req.headers["authorization"] && req.headers["authorization"].startsWith("Bearer ") ? req.headers["authorization"].substring(7) : null) ||
                        req.query.token;

  const expectedToken = process.env.PI_API_TOKEN || "catcam_secret_token_2026";

  if (!receivedToken || receivedToken !== expectedToken) {
    console.warn(`[Cloud Cam API] Unauthorized upload attempt blocked`);
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API token." });
  }

  const { timestamp, state, confidence, mediaUrl, logMessage, cpu_speed_mhz } = req.body;

  if (!state) {
    return res.status(400).json({ error: "State parameter is required" });
  }

  const newLog: CatLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: timestamp || new Date().toISOString(),
    state: state,
    confidence: confidence !== undefined ? parseFloat(confidence) : 0,
    mediaUrl: mediaUrl || "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600",
    logMessage: logMessage || "No detailed message provided by client Pi.",
    cpu_speed_mhz: cpu_speed_mhz || 1500
  };

  databaseLogs.unshift(newLog);
  console.log(`[Cloud Cam API] Registered new authenticated log ${newLog.id} with status: ${newLog.state}`);
  res.status(201).json({ status: "success", logId: newLog.id });
});

// API: Trigger simulated event cycle
app.post("/api/simulate", (req, res) => {
  const isCat = Math.random() > 0.3; // 70% chance of cat
  const confidence = isCat ? parseFloat((0.65 + Math.random() * 0.3).toFixed(2)) : parseFloat((Math.random() * 0.2).toFixed(2));
  
  const catUrls = [
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1513360309081-36f5e878fc11?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600"
  ];
  const dogUrls = [
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600"
  ];

  const selectedUrl = isCat ? catUrls[Math.floor(Math.random() * catUrls.length)] : dogUrls[0];
  
  const newLog: CatLog = {
    id: `sim_${Date.now()}`,
    timestamp: new Date().toISOString(),
    state: isCat ? "SUCCESS" : "FALSE_ALARM",
    confidence: confidence,
    mediaUrl: selectedUrl,
    logMessage: isCat 
      ? `PIR sensory high-pulse detected floor heat movement. Ramping up Pi 5 core frequency to 2.4 GHz. Handshake with NoIR camera module. Initiated YOLOv8-Nano inference. Matched Class 15 (cat) with ${Math.round(confidence * 100)}% confidence rate. Activating automatic cloud upload.`
      : `PIR sensory trigger occurred. Pi 5 core ramped up. Initiated YOLOv8-Nano inference. Matched canine/dust particles but cat confidence (${Math.round(confidence * 100)}%) remains below 60% threshold. Terminated video session. Core dropped back to 1.5 GHz powersave mode. Going to IDLE.`,
    cpu_speed_mhz: isCat ? 2400 : 1500
  };

  databaseLogs.unshift(newLog);
  res.json({ success: true, log: newLog });
});

// API: Clear Logs
app.post("/api/clear-logs", (req, res) => {
  databaseLogs = [];
  res.json({ success: true });
});

// API: Gemini AI Behavior & System Diagnosis Analyzer
app.post("/api/gemini-analyze", async (req, res) => {
  const { logId } = req.body;
  const log = databaseLogs.find(l => l.id === logId);

  if (!log) {
    return res.status(404).json({ error: "Log not found" });
  }

  // If already analyzed, return it
  if (log.behaviorAnalysis) {
    return res.json({ analysis: log.behaviorAnalysis });
  }

  const promptText = `
    You are an expert feline behaviorist and a custom Raspberry Pi 5 software development system.
    Analyze this motion-activated cat camera detection event:
    Event State: ${log.state}
    YOLOv8 Cat Confidence: ${log.confidence * 100}%
    Pi CPU Speed: ${log.cpu_speed_mhz} MHz
    Log notes: ${log.logMessage}
    Image context: ${log.mediaUrl}

    Generate a funny, accurate, and creative analysis of the cat's state of mind, its activity, and hardware calibration tips.
    
    You MUST return a JSON object with these EXACT keys:
    1. "title": A witty, descriptive title for this cat's pose or behavior (e.g. "The Sleepy Sentry", "Kitchen Counter Reconnaissance").
    2. "thoughts": Humorous diary-style inner thoughts of the cat in first person (I) describing what it's doing, how it views this Pi 5 set up, or what its feline intentions are. Keep it cute and detailed!
    3. "intensity": The energy or excitement level ("Low", "Medium", or "High").
    4. "recommendations": Practical technical tweaks for the user's specific Raspberry Pi 5 / NoIR camera / PIR sensor / Argon One case hardware setup. For example, mention sensor adjustments (PIR delay, YOLO threshold, Pi 5 cooling fan trigger thresholds, NoIR night exposure adjustments, or floor cam placement). Always align the suggestions to the hardware parts.
  `;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              thoughts: { type: Type.STRING },
              intensity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              recommendations: { type: Type.STRING }
            },
            required: ["title", "thoughts", "intensity", "recommendations"]
          }
        }
      });

      const analysisStr = response.text || "";
      const analysis = JSON.parse(analysisStr.trim());
      
      // Save it in database
      log.behaviorAnalysis = analysis;
      res.json({ analysis });
    } else {
      // Clean fallback if API key is not active
      const fallbackAnalyses: Record<string, any> = {
        High: {
          title: "The Floor Level Zoomies Specialist",
          thoughts: "I emerged from the shadows at approximately Mach 2. That small blinking box over by the baseboards was slow to record my magnificence! I must execute a rapid drift across the tiles to confuse its optical feed.",
          intensity: "High",
          recommendations: "Since your cat is moving extremely fast, increase the camera video capture framerate to 60fps on your NoIR camera (libcamera-vid config) and lower YOLOv8 confidence tolerance to 55% during zoomies periods to ensure detection triggers immediately."
        },
        Medium: {
          title: "The Suspicious Observer",
          thoughts: "Fascinating. The human has plugged in a new, huming box in an Argon One case. I feel the warmth radiating from its sleek metallic exhaust grills. It's a nice heater, but why is there a camera staring directly at my nose? I'll stare back.",
          intensity: "Medium",
          recommendations: "The cat is calmly inspecting the Argon One metal enclosure. If thermals rise, let the dual active cooler ramp up earlier. Place a neat layer of non-conductive shielding or elevate the Pi slightly to keep paw warmth away from exposed GPIO sensor pins."
        },
        Low: {
          title: "The Lounge Patrol",
          thoughts: "Why is there movement? I am simply turning my heavy carcass towards the kitchen. This mechanical eye captures my laziness in high resolution. Unacceptable. Keep cooking the processor so it at least warms up my tiles.",
          intensity: "Low",
          recommendations: "Since activity is low-energy near the floor level, consider setting the PIR debounce timer to 10 seconds. This avoids duplicate 'Wake Up' events when the cat is simply chilling or sleeping near the detection zone."
        }
      };

      const selectedIntensity = log.state === "SUCCESS" ? (log.confidence > 0.85 ? "Medium" : "High") : "Low";
      const selectedFallback = fallbackAnalyses[selectedIntensity];
      log.behaviorAnalysis = selectedFallback;
      res.json({ analysis: selectedFallback });
    }
  } catch (error) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: "Failed to generate behavior analysis using Gemini." });
  }
});


// Start server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CatCam Hub] Running full-stack server at http://localhost:${PORT}`);
  });
}

startServer();
