import React, { useState, useMemo } from "react";
import { Terminal, Copy, Check, FileCode, Sliders, ShieldCheck, Download, CodeXml } from "lucide-react";
import { HardwareConfig } from "../types";

interface ScriptGeneratorProps {
  config: HardwareConfig;
  setConfig: React.Dispatch<React.SetStateAction<HardwareConfig>>;
  serverUrl: string;
  apiToken: string;
}

export default function ScriptGenerator({ config, setConfig, serverUrl, apiToken }: ScriptGeneratorProps) {
  const [copied, setCopied] = useState("");
  const [activeTab, setActiveTab] = useState<"python" | "service" | "setup">("python");

  const serverEndpoint = `${serverUrl}/api/upload`;

  // Dynamically generate the Python script targeting Raspberry Pi 5 hardware
  const pythonScript = useMemo(() => {
    return `#!/usr/bin/env python3
"""
Motion-Activated Cat Camera System for Raspberry Pi 5
Features:
- Power Conservation state machine: ramps CPU up under load, cools to powersave in IDLE.
- Passive Infrared (PIR) body-heat sensor activation.
- NoIR Night-Vision Camera capture via OpenCV or Libcamera.
- Ultra fast YOLOv8-Nano inference targeting Feline (Class 15).
- Rest client uploading video clip / snapshots directly to cloud dashboard.
"""

import os
import sys
import time
import datetime
import requests
import cv2
import base64
from gpiozero import MotionSensor
from ultralytics import YOLO

# --- DYNAMIC CONFIGURATION ---
PIR_GPIO_PIN = ${config.pirPin}
YOLO_CONF_THRESHOLD = ${config.detectionConfidence}
CAPTURE_DURATION = ${config.captureDuration} # seconds
RESOLUTION = (${config.cameraResolution.split('x')[0]}, ${config.cameraResolution.split('x')[1]})
CLOUD_ENDPOINT = "${serverEndpoint}"
PI_API_TOKEN = "${apiToken || "catcam_secret_token_2026"}"
LOCAL_CLIP_DIR = "/home/pi/cat_clips"

# Ensure clip vault exists
os.makedirs(LOCAL_CLIP_DIR, exist_ok=True)

# Initialize YOLOv8-Nano model
print("[INITIALIZING] Loading YOLOv8-Nano neural layers...")
model = YOLO("yolov8n.pt")  # Auto-downloads if not present

# Setup PIR Sensor on Pi 5 RP1 chip
pir = MotionSensor(PIR_GPIO_PIN)

def set_cpu_governor(state):
    """Adjusts Raspberry Pi 5 Core frequencies via core governor"""
    cmd = f"echo {state} | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor > /dev/null 2>&1"
    os.system(cmd)
    print(f"[POWER SETTING] Ramping CPU Governor to: {state}")

def trigger_argon_fan(duty_cycle):
    """Communicates cooling level to Argon One case over I2C register"""
    try:
        # Argon One case registers default I2C fan address 0x015
        os.system(f"i2cset -y 1 0x015 {duty_cycle} > /dev/null 2>&1")
        print(f"[COOCING] Argon One fan scaled to Speed: {duty_cycle}%")
    except Exception as e:
        pass

def convert_image_to_base64(filepath):
    """Converts local snap to base64 Data URL for easy API carriage"""
    try:
        with open(filepath, "rb") as img_file:
            encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
            return f"data:image/jpeg;base64,{encoded_string}"
    except Exception as e:
        print(f"[ERROR] Base64 conversion failed: {e}")
        return None

def start_capture_and_inference():
    print("[WAKE UP] PIR triggered floor state. Booting core resources...")
    set_cpu_governor("performance") # Ramp frequency up
    trigger_argon_fan(${config.fanSpeedThreshold}) # Boost fan for inference cooling

    # Initialize NoIR Camera
    print("[CAMERA] Powering up NoIR camera array...")
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, RESOLUTION[0])
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, RESOLUTION[1])
    
    if not cap.isOpened():
        print("[ERROR] Could not communicate with NoIR sensor. Resetting loop.")
        set_cpu_governor("powersave")
        trigger_argon_fan(10)
        return

    # Warm up camera sensor for 1 second
    time.sleep(1)

    start_time = time.time()
    cat_detected = False
    max_confidence = 0.0
    saved_snapshot_path = None
    
    print("[INFERENCE] Commencing YOLOv8-Nano detection windows...")
    while time.time() - start_time < 5.0:  # 5-second scanner window
        ret, frame = cap.read()
        if not ret:
            break

        # Execute quick scan
        results = model(frame, verbose=False)
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                
                # Class 15 corresponds to 'cat' in COCO dataset
                if cls_id == 15 and conf >= YOLO_CONF_THRESHOLD:
                    print(f"\\n[!] CAT DETECTED! Confidence: {conf*100:.1f}%")
                    cat_detected = True
                    if conf > max_confidence:
                        max_confidence = conf
                        # Keep high quality snapshot to send to cloud
                        snap_name = f"cat_det_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                        saved_snapshot_path = os.path.join(LOCAL_CLIP_DIR, snap_name)
                        cv2.imwrite(saved_snapshot_path, frame)

        if cat_detected:
            break

    # Shutdown Camera
    cap.release()
    cv2.destroyAllWindows()
    print("[CAMERA] NoIR power supply disconnected.")

    if cat_detected and saved_snapshot_path:
        print("[EVENT TRIGGER] Log event and package frames for API carriage...")
        media_b64 = convert_image_to_base64(saved_snapshot_path)
        
        # Package REST API Payload
        payload = {
            "timestamp": datetime.datetime.now().isoformat() + "Z",
            "state": "SUCCESS",
            "confidence": round(max_confidence, 2),
            "mediaUrl": media_b64,
            "logMessage": f"PIR Sensor detected floor heat. YOLOv8 Cat detected with {max_confidence*100:.1f}% confidence. Save event fired.",
            "cpu_speed_mhz": 2400
        }
        
        headers = {
            "Authorization": f"Bearer {PI_API_TOKEN}",
            "Content-Type": "application/json"
        }
        
        try:
            r = requests.post(CLOUD_ENDPOINT, json=payload, headers=headers, timeout=10)
            if r.status_code == 201:
                print("[SUCCESS] Cloud upload validated successfully!")
            else:
                print(f"[CLOUD FAILED] Server rejected package: {r.status_code}")
        except Exception as e:
            print(f"[CONNECTIVITY ERROR] Cloud dashboard is unreachable: {e}")
            
    else:
        print("[FALSE ALARM] No feline elements matched within 5s scan window.")
        # Send false alarm trigger back to our log db
        try:
            payload = {
                "timestamp": datetime.datetime.now().isoformat() + "Z",
                "state": "FALSE_ALARM",
                "confidence": 0.05,
                "logMessage": "PIR heat trigger registered. SCAN finished. Cats undetected. Downclocking.",
                "cpu_speed_mhz": 1500
            }
            headers_fa = {
                "Authorization": f"Bearer {PI_API_TOKEN}",
                "Content-Type": "application/json"
            }
            requests.post(CLOUD_ENDPOINT, json=payload, headers=headers_fa, timeout=5)
        except:
            pass

    # Cool down back to power conservation IDLE
    set_cpu_governor("powersave")
    trigger_argon_fan(0) # Fan off/passive mode
    print("[IDLE] System back to power save. Monitoring PIR sensor floors...")

# Init sleep settings on active boot
set_cpu_governor("powersave")
trigger_argon_fan(0)

print("[READY] Feline tracker listening to PIR sensor. Press Ctrl+C to terminate.")
while True:
    try:
        pir.wait_for_motion()
        start_capture_and_inference()
        # Sleep for a bit to avoid rapid re-triggering
        time.sleep(10)
    except KeyboardInterrupt:
        print("\\n[TERMINATING] Exiting service.")
        set_cpu_governor("ondemand")
        break
`;
  }, [config, serverEndpoint, apiToken]);

  const serviceFile = useMemo(() => {
    return `[Unit]
Description=Feline Tracker Cat Camera Daemon
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/pi/catcam.py
WorkingDirectory=/home/pi
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
`;
  }, []);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-850 rounded-none p-6" id="script-generator-container">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Parameters Tuning */}
        <div className="w-full lg:w-1/3 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <h3 className="font-mono text-xs font-bold tracking-[0.2em] uppercase text-white">
                HARDWARE CALIBRATION PANEL
              </h3>
            </div>
            <p className="font-sans text-[11px] text-slate-400 mb-6">
              Dynamically tuner parameters for dual-clock RP1 chips. The code matrix on the right will auto-adapt.
            </p>
 
            <div className="space-y-6">
              {/* PIR Pin */}
              <div className="group">
                <label className="flex justify-between text-[11px] text-slate-300 font-mono mb-2 uppercase tracking-wide">
                  <span>PIR Sensor GPIO Pin</span>
                  <span className="font-mono text-emerald-400 font-bold">Pin GPIO {config.pirPin}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="27"
                  value={config.pirPin}
                  onChange={(e) => setConfig({ ...config, pirPin: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-950 rounded-none appearance-none cursor-pointer accent-white"
                />
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">Typically Pin 4. Registers floor heatmap sequences.</span>
              </div>
 
              {/* Confidence Threshold */}
              <div className="group">
                <label className="flex justify-between text-[11px] text-slate-300 font-mono mb-2 uppercase tracking-wide">
                  <span>YOLOv8-Nano Confidence Lvl</span>
                  <span className="font-mono text-emerald-400 font-bold">{Math.round(config.detectionConfidence * 100)}% Match</span>
                </label>
                <input
                  type="range"
                  min="0.40"
                  max="0.95"
                  step="0.05"
                  value={config.detectionConfidence}
                  onChange={(e) => setConfig({ ...config, detectionConfidence: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-950 rounded-none appearance-none cursor-pointer accent-white"
                />
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">Higher confidence cuts down ambient canine/shadow false positives.</span>
              </div>
 
              {/* Argon Fan Boost Speed */}
              <div className="group">
                <label className="flex justify-between text-[11px] text-slate-300 font-mono mb-2 uppercase tracking-wide">
                  <span>Argon One Fan Trigger Limit</span>
                  <span className="font-mono text-emerald-400 font-bold">{config.fanSpeedThreshold}% RPM</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={config.fanSpeedThreshold}
                  onChange={(e) => setConfig({ ...config, fanSpeedThreshold: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-950 rounded-none appearance-none cursor-pointer accent-white"
                />
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">Sets the active cooling threshold of the sub-system.</span>
              </div>
 
              {/* NoIR Video Scale */}
              <div>
                <label className="text-[11px] text-slate-300 font-mono block mb-2 uppercase tracking-wide">Optical Matrix Resolution</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["800x600", "1280x720", "1920x1080"] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setConfig({ ...config, cameraResolution: res })}
                      className={`font-mono text-[9px] py-1.5 border rounded-none transition-colors uppercase tracking-wider ${config.cameraResolution === res ? 'border-emerald-500 bg-emerald-950/25 text-emerald-400 font-bold' : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'}`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
 
          <div className="mt-8 bg-slate-950 p-4 border border-slate-850 rounded-none">
            <h4 className="flex items-center gap-1.5 font-mono font-bold text-[10px] uppercase text-emerald-400 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              SHARED KEY AUTHENTICATION
            </h4>
            <p className="font-sans text-[11px] text-slate-400 leading-relaxed mb-3">
              Your upload endpoints are secured. Set this token in your `.env` configuration to authorize automated camera sequences:
            </p>
            <div className="bg-slate-900 border border-slate-800 p-2.5 py-2 font-mono text-[10px] text-slate-300 flex items-center justify-between">
              <span className="select-all font-bold tracking-wider text-white bg-slate-950 px-2 py-1 border border-slate-800/85">{apiToken || "catcam_secret_token_2026"}</span>
              <span className="text-[8px] text-emerald-400 font-bold tracking-widest uppercase bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-900/40">SECURED</span>
            </div>
          </div>
        </div>
 
        {/* Right Side: Script Tabs */}
        <div className="w-full lg:w-2/3 flex flex-col justify-between">
          <div>
            <div className="flex border-b border-slate-800 mb-4 overflow-x-auto gap-1">
              {/* Python Script Tab */}
              <button
                onClick={() => setActiveTab("python")}
                className={`py-2 px-5 font-mono text-[10px] uppercase tracking-widest font-bold border-b-2 transition-colors ${activeTab === "python" ? "border-emerald-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                catcam.py
              </button>
              {/* Systemd daemon tab */}
              <button
                onClick={() => setActiveTab("service")}
                className={`py-2 px-5 font-mono text-[10px] uppercase tracking-widest font-bold border-b-2 transition-colors ${activeTab === "service" ? "border-emerald-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                catcam.service
              </button>
              {/* Pi Console setup tab */}
              <button
                onClick={() => setActiveTab("setup")}
                className={`py-2 px-5 font-mono text-[10px] uppercase tracking-widest font-bold border-b-2 transition-colors ${activeTab === "setup" ? "border-emerald-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
              >
                Installation Steps
              </button>
            </div>

            {/* Tab Contents */}
            <div className="relative bg-slate-950 border border-slate-800 rounded-none max-h-[380px] overflow-y-auto">
              
              {/* Copy floating button */}
              <button
                onClick={() => copyToClipboard(activeTab === "python" ? pythonScript : activeTab === "service" ? serviceFile : "catcam_commands", activeTab)}
                className="absolute top-3 right-3 bg-white hover:bg-slate-200 text-black p-2 py-1.5 rounded-none transition-colors z-10 flex items-center gap-1 focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                title="Copy script"
              >
                {copied === activeTab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px] uppercase font-mono font-bold">{copied === activeTab ? "Copied" : "Copy"}</span>
              </button>

              {activeTab === "python" && (
                <pre className="p-4 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {pythonScript}
                </pre>
              )}

              {activeTab === "service" && (
                <pre className="p-4 text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {serviceFile}
                </pre>
              )}

              {activeTab === "setup" && (
                <div className="p-6 font-sans text-xs text-slate-300 space-y-5 leading-relaxed">
                  <div>
                    <h4 className="font-mono font-bold text-[10px] uppercase text-emerald-400 tracking-wider mb-1.5">Step 1: Install Python dependencies on Raspberry Pi 5</h4>
                    <p className="text-slate-400 mb-2">On the Pi 5 terminal, create a virtual environment or install global dependencies:</p>
                    <pre className="bg-slate-900 p-3 rounded-none border border-slate-800 text-emerald-450 text-[11px] font-mono overflow-x-auto">
                      {`sudo apt update
sudo apt install -y python3-opencv python3-requests python3-pip python3-gpiozero i2c-tools
pip3 install ultralytics --break-system-packages`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-mono font-bold text-[10px] uppercase text-emerald-400 tracking-wider mb-1.5">Step 2: Save the Python script</h4>
                    <p className="text-slate-400 mb-2 font-sans">Create and populate <code className="font-mono text-amber-500 text-[11.5px] bg-slate-900 px-1.5 py-0.5 rounded-none border border-slate-800">/home/pi/catcam.py</code> with the code under the <span className="font-semibold text-white">catcam.py</span> tab.</p>
                  </div>

                  <div>
                    <h4 className="font-mono font-bold text-[10px] uppercase text-emerald-400 tracking-wider mb-1.5">Step 3: Enable Background Daemon Service</h4>
                    <p className="text-slate-400 mb-2 font-sans">To start this system automatically when the Raspberry Pi 5 boots, save the service configuration in <code className="font-mono text-amber-500 text-[11.5px] bg-slate-900 px-1.5 py-0.5 rounded-none border border-slate-800">/etc/systemd/system/catcam.service</code>, then reload:</p>
                    <pre className="bg-slate-900 p-3 rounded-none border border-slate-800 text-emerald-450 text-[11px] font-mono overflow-x-auto">
                      {`sudo systemctl daemon-reload
sudo systemctl enable catcam.service
sudo systemctl start catcam.service
# Check logs state
sudo journalctl -u catcam.service -f`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-mono font-bold text-[10px] uppercase text-emerald-400 tracking-wider mb-1.5">Step 4: Argon One Fan Integration (Optional)</h4>
                    <p className="text-slate-400 mb-1">
                      Cytron's Argon One Case controls fan speed via the I2C bus. To grant permission for hardware I2C transfer:
                    </p>
                    <pre className="bg-slate-900 p-2.5 rounded-none border border-slate-800 text-emerald-400 text-[11px] font-mono overflow-x-auto">
                      sudo usermod -aG i2c pi
                    </pre>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950 border border-slate-850 rounded-none p-4 gap-4">
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
              ENDPOINT MATRIX ADDRESS // <span className="text-slate-300 font-mono select-all font-bold">{serverEndpoint}</span>
            </span>
            <div className="flex gap-2">
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(pythonScript)}`}
                download="catcam.py"
                className="bg-white hover:bg-slate-200 text-black px-4 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                id="btn-download-script"
              >
                <Download className="w-3.5 h-3.5" />
                Download Script
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
