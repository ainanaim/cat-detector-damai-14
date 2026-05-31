import { useState, useEffect } from "react";
import { 
  Play, 
  Cpu, 
  Camera, 
  Settings, 
  Activity, 
  Video, 
  Info, 
  RefreshCw, 
  HelpCircle,
  Lightbulb,
  Zap,
  CheckCircle,
  Sparkles,
  Database
} from "lucide-react";
import { CatLog, HardwareConfig, PiSystemState } from "./types";
import StateVisualizer from "./components/StateVisualizer";
import ScriptGenerator from "./components/ScriptGenerator";
import UploadGallery from "./components/UploadGallery";

export default function App() {
  // Config state
  const [config, setConfig] = useState<HardwareConfig>({
    pirPin: 4,
    fanSpeedThreshold: 45,
    detectionConfidence: 0.60,
    captureDuration: 5,
    cameraResolution: "1280x720",
    sleepModeTargetFreq: "powersave"
  });

  // State loop for Raspberry Pi
  const [systemState, setSystemState] = useState<PiSystemState>("IDLE");
  const [temperature, setTemperature] = useState<number>(41.5);
  const [logs, setLogs] = useState<CatLog[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string>("");
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState({ hasGemini: false, apiKeyConfigured: false, apiToken: "" });
  const [serverUrl, setServerUrl] = useState<string>("");

  // Determine actual server URL context
  useEffect(() => {
    setServerUrl(window.location.origin);
  }, []);

  // Poll configuration capabilities and event logs on mount
  const refreshLogs = async () => {
    try {
      const response = await fetch("/api/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    }
  };

  useEffect(() => {
    refreshLogs();
    
    // Poll config status to see if server-side Gemini is armed
    fetch("/api/config-status")
      .then((res) => res.json())
      .then((data) => setConfigStatus(data))
      .catch((err) => console.error("Error reading server config:", err));
  }, []);

  // Periodic temperature noise simulator depending on core workloads
  useEffect(() => {
    const timer = setInterval(() => {
      setTemperature((prev) => {
        let target = 42.0; // Idle baseline temperature
        if (systemState === "WAKE_UP") target = 48.5;
        if (systemState === "INFERENCE") target = 56.5;
        if (systemState === "DETECTED") target = 52.0;
        if (systemState === "SLEEPING_COOLING") target = 45.0;

        const diff = target - prev;
        // Move towards target temperature with minor fluctuation noise
        const step = diff * 0.15 + (Math.random() - 0.5) * 0.5;
        const newTemp = Math.max(38.0, Math.min(85.0, prev + step));
        return parseFloat(newTemp.toFixed(1));
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [systemState]);

  // Client Simulation of the complete hardware thread Loop
  const handleTriggerSimulate = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    try {
      // Step 1: WAKE UP
      setSystemState("WAKE_UP");
      setSimulationStep(`PIR trigger detected floor heat. Core Governor bumped to PERFORMANCE.`);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 2: INFERENCE
      setSystemState("INFERENCE");
      setSimulationStep(`YOLOv8-Nano searching frame matrices... Confidence Threshold set at ${Math.round(config.detectionConfidence * 100)}%`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 3: API Request
      setSimulationStep(`Decision logic finalising...`);
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const result = await response.json();
        const outcomeLog = result.log as CatLog;
        
        if (outcomeLog.state === "SUCCESS") {
          setSystemState("DETECTED");
          setSimulationStep(`Feline match detected with ${Math.round(outcomeLog.confidence * 100)}% confidence rate! Save video & cloud upload trigger.`);
        } else {
          setSystemState("SLEEPING_COOLING");
          setSimulationStep(`No cats matched. Cooldown timeout starting.`);
        }
        
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await refreshLogs();
      }

    } catch (e) {
      console.error("Simulation error: ", e);
    } finally {
      // Reset back to idle
      setSystemState("IDLE");
      setSimulationStep("");
      setIsSimulating(false);
    }
  };

  // behavior assessment connector calling server side Gemini models
  const handleTriggerAnalyze = async (logId: string) => {
    setIsAnalyzingId(logId);
    try {
      const response = await fetch("/api/gemini-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId })
      });
      if (response.ok) {
        await refreshLogs();
      }
    } catch (err) {
      console.error("Error analyzing behavioral logs:", err);
    } finally {
      setIsAnalyzingId(null);
    }
  };

  const handleClearLogs = async () => {
    try {
      const r = await fetch("/api/clear-logs", { method: "POST" });
      if (r.ok) {
        await refreshLogs();
      }
    } catch (err) {
      console.error("Could not purge logs list:", err);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-300 font-sans flex flex-col justify-between" id="applet-viewport">
      
      {/* Geometric Balance Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50" id="app-header">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white flex items-center gap-2">
            Feline-Logic // RPi 5 Cat Cam
            <span className="font-mono text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-normal">
              v1.0
            </span>
          </h1>
        </div>

        {/* Global Hardware Logic telemetry */}
        <div className="hidden lg:flex gap-8 text-[10px] uppercase tracking-widest font-semibold font-mono">
          <div className="flex flex-col items-end">
            <span className="text-slate-500">PIR Pin Mode</span>
            <span className="text-emerald-400">GPIO {config.pirPin} Scan</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500">Core Frequency</span>
            <span className="text-amber-400">{systemState === "IDLE" ? "1.5 GHz" : "2.4 GHz"}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500">COCO Classifier</span>
            <span className="text-white">YOLOv8-Nano v4</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-500">Storage Sync</span>
            <span className="text-emerald-500">Cloud Stream Host</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Configuration badge */}
          {configStatus.apiKeyConfigured ? (
            <span className="hidden sm:inline-flex bg-emerald-950/40 border border-emerald-850 text-emerald-400 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm font-bold font-sans">
              Gemini AI Armed
            </span>
          ) : (
            <span className="hidden sm:inline-flex bg-blue-950/30 border border-blue-900 text-blue-400 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm font-sans font-semibold">
              Sandbox Active
            </span>
          )}

          <button
            onClick={handleTriggerSimulate}
            disabled={isSimulating}
            className={`px-5 py-2 text-[10px] uppercase font-bold tracking-widest transition-all focus:ring-1 focus:ring-emerald-400 ${
              isSimulating 
                ? 'bg-slate-900 text-slate-600 border border-slate-800' 
                : 'bg-white text-black hover:bg-slate-200 cursor-pointer active:translate-y-[1px]'
            }`}
            id="btn-simulate-event"
          >
            {isSimulating ? "SIMULATING..." : "FORCE TRIGGER"}
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="max-w-7xl mx-auto w-full px-8 py-8 space-y-6 flex-grow">
        
        {/* Intro Info Banner with fine layout */}
        <div className="bg-slate-900/50 p-6 border border-slate-800 rounded-sm flex flex-col md:flex-row gap-4 items-start relative overflow-hidden" id="intro-banner">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="w-1.5 h-12 bg-emerald-500 flex-shrink-0"></div>
          <div className="space-y-1 z-10">
            <h3 className="font-sans font-bold text-xs tracking-wider uppercase text-slate-200">System Mechanics // Power Efficiency Guide</h3>
            <p className="font-sans text-xs text-slate-400 leading-relaxed max-w-4xl">
              Raspberry Pi 5 features massive rendering power but can be heavy on battery cells. 
              Our design implements high-precision power conservation: the RPi 5 idle state remains at a downclocked state (<span className="text-blue-400 font-mono">1.5 GHz powersave</span>), keeping the NoIR night-vision sensor disabled until heat movement is matched. 
              Once high-pulse thermal movement is caught by the floor PIR module, the kernel governor immediately boosts to <span className="text-amber-400 font-mono">2.4 GHz performance</span> and prompts <span className="font-semibold text-slate-100">YOLOv8-Nano</span> to inspect matrix frames. If a cat stays absent for 5s, variables unload to conserve cooling.
            </p>
          </div>
        </div>

        {/* Live Simulator active notification */}
        {isSimulating && (
          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-sm animate-pulse flex items-center justify-between shadow-[0_0_12px_rgba(16,185,129,0.06)] relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-emerald-500"></div>
            <div className="flex items-center gap-3 pl-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
              <div>
                <span className="font-mono text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">Active Execution Frame</span>
                <p className="text-xs text-slate-300 mt-1">{simulationStep}</p>
              </div>
            </div>
            <div className="font-mono text-[10px] text-emerald-400 font-bold tracking-widest bg-slate-950 border border-slate-850 px-3 py-1 rounded-sm uppercase">
              {systemState}
            </div>
          </div>
        )}

        {/* State Machine Visualization widget */}
        <StateVisualizer 
          currentState={systemState}
          config={config}
          temperature={temperature}
        />

        {/* Custom Installer and Script Builder configuration */}
        <ScriptGenerator 
          config={config}
          setConfig={setConfig}
          serverUrl={serverUrl}
          apiToken={configStatus.apiToken}
        />

        {/* Upload records feed stream gallery */}
        <UploadGallery 
          logs={logs}
          onTriggerAnalyze={handleTriggerAnalyze}
          onClearLogs={handleClearLogs}
          isAnalyzingId={isAnalyzingId}
          hasGeminiActive={configStatus.apiKeyConfigured}
        />

      </main>

      {/* Elegant, high-contrast geometric footer */}
      <footer className="border-t border-slate-900 bg-slate-900/10 py-6 text-center text-[10px] text-slate-500 uppercase tracking-widest font-mono" id="app-footer">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 Feline-Logic // Core system telemetry online.</p>
          <div className="flex gap-6 font-semibold">
            <span className="text-slate-500 hover:text-slate-400 transition-colors">NOIR Night Sensor: ACTIVE</span>
            <span className="text-emerald-500 hover:text-emerald-400 transition-colors">YOLOv8 Classifier: MATCHED</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
