import { motion } from "motion/react";
import { Cpu, Eye, EyeOff, ShieldAlert, CheckCircle, Zap, Fan, Flame, Activity } from "lucide-react";
import { PiSystemState, HardwareConfig } from "../types";

interface StateVisualizerProps {
  currentState: PiSystemState;
  config: HardwareConfig;
  temperature: number;
}

export default function StateVisualizer({ currentState, config, temperature }: StateVisualizerProps) {
  // Helper to determine active node classes matching Geometric Balance
  const getNodeClass = (nodeState: PiSystemState) => {
    const isActive = currentState === nodeState;
    return isActive
      ? "bg-slate-900 border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)] text-white"
      : "bg-slate-950/70 border border-slate-900 text-slate-500 opacity-50";
  };

  const getStatsForState = () => {
    switch (currentState) {
      case "IDLE":
        return {
          cpu: "1.5 GHz",
          cpuColor: "text-blue-400 font-mono",
          camera: "OFFLINE / OFF",
          cameraIcon: <EyeOff className="w-3.5 h-3.5 text-slate-600" id="cam-off-icon" />,
          fanSpeed: "Passive (0%)",
          sensorStatus: "PIR Waiting on floor height scan",
          sensorColor: "text-emerald-400 animate-pulse font-mono",
          pwrMode: "powersave",
        };
      case "WAKE_UP":
        return {
          cpu: "2.4 GHz (Turbo Boost)",
          cpuColor: "text-amber-400 font-bold font-mono",
          camera: "INITIALIZING NOIR SENSOR...",
          cameraIcon: <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" id="cam-init-icon" />,
          fanSpeed: `${config.fanSpeedThreshold}% RPM`,
          sensorStatus: "PIR Trigger registered",
          sensorColor: "text-amber-400 font-semibold font-mono",
          pwrMode: "ondemand",
        };
      case "INFERENCE":
        return {
          cpu: "3.1 GHz (Core Ramp)",
          cpuColor: "text-red-400 font-bold animate-pulse font-mono",
          camera: "NOIR ACTIVE (Matrix Feed Open)",
          cameraIcon: <Eye className="w-3.5 h-3.5 text-red-500 animate-ping" id="cam-active-icon" />,
          fanSpeed: `${config.fanSpeedThreshold + 15}% RPM`,
          sensorStatus: "Scanning Class 15 layers",
          sensorColor: "text-blue-400 animate-pulse font-mono",
          pwrMode: "performance (max)",
        };
      case "DETECTED":
        return {
          cpu: "2.4 GHz (Sustained Load)",
          cpuColor: "text-emerald-400 font-bold font-mono",
          camera: "RECORDING VIDEO CLIP...",
          cameraIcon: <Eye className="w-3.5 h-3.5 text-emerald-400 animate-pulse" id="cam-rec-icon" />,
          fanSpeed: `${config.fanSpeedThreshold + 20}% RPM`,
          sensorStatus: "Class 15 Matched!",
          sensorColor: "text-emerald-400 font-bold animate-pulse font-mono",
          pwrMode: "performance",
        };
      case "SLEEPING_COOLING":
        return {
          cpu: "1.5 GHz (Cooling)",
          cpuColor: "text-blue-400 font-mono",
          camera: "SHUTTING DOWN FEED...",
          cameraIcon: <EyeOff className="w-3.5 h-3.5 text-slate-600" id="cam-cool-icon" />,
          fanSpeed: "10% RPM (Post Run)",
          sensorStatus: "Idle (5s cooldown active)",
          sensorColor: "text-slate-500 font-mono",
          pwrMode: "powersave",
        };
    }
  };

  const sysStats = getStatsForState();

  // Compute thermal and fan progress gauges
  const tempPercentage = Math.min(100, Math.max(0, ((temperature - 30) / 55) * 100)); // 30°C to 85°C
  const fanPercentage = currentState === "IDLE" ? 0 : currentState === "SLEEPING_COOLING" ? 10 : currentState === "WAKE_UP" ? config.fanSpeedThreshold : currentState === "INFERENCE" ? config.fanSpeedThreshold + 15 : config.fanSpeedThreshold + 20;

  return (
    <div className="bg-slate-900 border border-slate-850 rounded-none p-6 relative overflow-hidden" id="state-visualizer-container">
      {/* Precision Grid Overlay Accents */}
      <div className="absolute top-0 bottom-0 left-0 right-0 grid grid-cols-12 pointer-events-none opacity-5">
        <div className="col-span-1 border-r border-white/5 h-full"></div>
        <div className="col-span-1 border-r border-white/5 h-full"></div>
        <div className="col-span-1 border-r border-white/5 h-full"></div>
        <div className="col-span-1 border-r border-white/5 h-full"></div>
        <div className="col-span-1 border-r border-white/5 h-full"></div>
        <div className="col-span-1 border-r border-white/5 h-full"></div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <h3 className="font-mono text-xs font-bold tracking-[0.2em] uppercase text-white">
              PROCESS LOGIC STATE MACHINE // RP1 CONTROLLER
            </h3>
          </div>
          <p className="font-sans text-[11px] text-slate-400 mt-1">
            Real-time power governance state-flow mapping hardware frequencies to active sensors
          </p>
        </div>
        
        {/* Geometric Balance active stats meter */}
        <div className="flex gap-6 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial flex flex-col min-w-[90px]">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold mb-1">Temperature</span>
            <span className="text-sm font-semibold font-mono text-white flex items-baseline gap-1">
              {temperature.toFixed(1)}°C
              <span className="text-[9px] text-slate-500 font-normal">MAX 85°C</span>
            </span>
            <div className="w-full h-1 bg-slate-950 mt-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${temperature > 60 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                style={{ width: `${tempPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="flex-1 sm:flex-initial flex flex-col min-w-[90px]">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold mb-1">Dual Active Fan</span>
            <span className="text-sm font-semibold font-mono text-white flex items-baseline gap-1">
              {sysStats.fanSpeed}
              <span className="text-[9px] text-emerald-500 font-normal">LIVE</span>
            </span>
            <div className="w-full h-1 bg-slate-950 mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${fanPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* State Machine Flowchart: Geometric, clean numbered blocks */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch relative py-4 z-10">
        
        {/* Node 1: IDLE */}
        <motion.div 
          animate={{ scale: currentState === "IDLE" ? 1.02 : 1 }}
          className={`border p-5 rounded-none flex flex-col justify-between transition-all ${getNodeClass("IDLE")}`}
          id="node-idle"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold ${currentState === "IDLE" ? "border-emerald-500 bg-emerald-950/20 text-emerald-400" : "border-slate-800 text-slate-500"}`}>
                01
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Idle Governor</span>
            </div>
            <h4 className="font-mono font-bold text-xs text-slate-100 uppercase tracking-widest">IDLE SLEEP</h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed font-sans">
            Minimal core clocks (1.5 GHz) to limit heat output inside Cytron case. NoIR night module asleep.
          </p>
        </motion.div>

        {/* Transition Row 1 */}
        <div className="flex flex-col items-center justify-center py-2 opacity-80 min-h-[40px]">
          <span className="text-[9px] font-mono text-emerald-400 tracking-wider text-center max-w-[110px] mb-1.5 leading-tight uppercase font-medium">PIR HEAT PULSE</span>
          <div className="w-full h-[1px] bg-slate-800 relative hidden md:block">
            {currentState !== "IDLE" && (
              <motion.div 
                initial={{ left: 0 }}
                animate={{ left: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[1.5px] w-1 h-1 bg-emerald-400 rotate-45"
              />
            )}
          </div>
          <div className="h-6 w-[1px] bg-slate-800 md:hidden"></div>
        </div>

        {/* Node 2: WAKE UP */}
        <motion.div 
          animate={{ scale: currentState === "WAKE_UP" ? 1.02 : 1 }}
          className={`border p-5 rounded-none flex flex-col justify-between transition-all ${getNodeClass("WAKE_UP")}`}
          id="node-wakeup"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold ${currentState === "WAKE_UP" ? "border-emerald-500 bg-emerald-950/20 text-emerald-400" : "border-slate-800 text-slate-500"}`}>
                02
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Initialize</span>
            </div>
            <h4 className="font-mono font-bold text-xs text-slate-100 uppercase tracking-widest">CORE RAMP</h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed font-sans">
            GPIO trigger caught. CPU pins jump to 2.4 GHz. Camera matrices initialization buffer is active.
          </p>
        </motion.div>

        {/* Transition Row 2 */}
        <div className="flex flex-col items-center justify-center py-2 opacity-80 min-h-[40px]">
          <span className="text-[9px] font-mono text-slate-400 tracking-wider text-center max-w-[110px] mb-1.5 leading-tight uppercase font-medium">PREPARE YOLO</span>
          <div className="w-full h-[1px] bg-slate-800 relative hidden md:block">
            {(currentState === "INFERENCE" || currentState === "DETECTED") && (
              <motion.div 
                initial={{ left: 0 }}
                animate={{ left: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[1.5px] w-1 h-1 bg-amber-400 rotate-45"
              />
            )}
          </div>
          <div className="h-6 w-[1px] bg-slate-800 md:hidden"></div>
        </div>

        {/* Node 3: INFERENCE */}
        <motion.div 
          animate={{ scale: currentState === "INFERENCE" ? 1.02 : 1 }}
          className={`border p-5 rounded-none flex flex-col justify-between transition-all ${getNodeClass("INFERENCE")}`}
          id="node-inference"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold ${currentState === "INFERENCE" ? "border-emerald-500 bg-emerald-950/20 text-emerald-400" : "border-slate-800 text-slate-500"}`}>
                03
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Analysis Mode</span>
            </div>
            <h4 className="font-mono font-bold text-xs text-slate-100 uppercase tracking-widest">YOLO INFERENCE</h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed font-sans">
            YOLOv8-Nano neural layers scan frames looking for COCO Class 15. Timeout is secured at {config.captureDuration}s.
          </p>
        </motion.div>

      </div>

      {/* Decision Outcomes / Branch Outcomes */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-6 z-10 relative">
        
        {/* outcome 1: VALIDATED DETECTED */}
        <div className={`p-5 border transition-all rounded-none ${currentState === "DETECTED" ? "border-emerald-500 bg-emerald-950/10" : "border-slate-850 bg-slate-950/20"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 border border-emerald-900/50">
              CASE A // FELINE VALIDATED (Class 15)
            </span>
          </div>
          <h4 className="font-sans font-bold text-xs text-slate-200 mt-1 uppercase tracking-wide">Automatic Sync & Video Vault Locks</h4>
          <p className="font-sans text-xs text-slate-400 mt-1.5 leading-relaxed">
            Instantly preserves a local H264 high-framerate sequence inside local directories and utilizes requests package to deliver a payload payload to the central logging database.
          </p>
        </div>

        {/* outcome 2: TIMEOUT EXPIRED */}
        <div className={`p-5 border transition-all rounded-none ${currentState === "SLEEPING_COOLING" ? "border-amber-500 bg-amber-950/10" : "border-slate-850 bg-slate-950/20"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-bold bg-amber-950/50 px-2 py-0.5 border border-amber-900/50">
              CASE B // SCANNED WITH VACANCY
            </span>
          </div>
          <h4 className="font-sans font-bold text-xs text-slate-200 mt-1 uppercase tracking-wide">Graceful Cool and Minimise Clocks</h4>
          <p className="font-sans text-xs text-slate-400 mt-1.5 leading-relaxed">
            If vacancies persist for over 5s, the NoIR feed closes safely. Core scaling drops to 1.5 GHz instantly, avoiding thermal builds and passive cooling vents.
          </p>
        </div>

      </div>

      {/* System Specifications Bottom Row */}
      <div className="mt-6 bg-slate-950 p-4 border border-slate-850 rounded-none z-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500"></div>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400">System State Terminal Specs // IO Core</span>
          </div>
          <span className="font-mono text-[9px] text-emerald-400">SYSTEM RESPONDING ● ONLINE</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          <div className="bg-slate-900 border border-slate-850 px-3 py-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Pi Regulator Mode</span>
            <span className="font-mono text-xs font-semibold text-slate-300 mt-1 uppercase">{sysStats.pwrMode}</span>
          </div>
          <div className="bg-slate-900 border border-slate-850 px-3 py-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Core Frequency</span>
            <span className={`text-xs font-semibold mt-1 ${sysStats.cpuColor}`}>{sysStats.cpu}</span>
          </div>
          <div className="bg-slate-900 border border-slate-850 px-3 py-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">NoIR Camera bus</span>
            <span className="font-mono text-xs font-semibold text-slate-300 mt-1 truncate">{sysStats.camera}</span>
          </div>
          <div className="bg-slate-900 border border-slate-850 px-3 py-2 flex flex-col">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Debouncer Stat</span>
            <span className={`text-xs font-semibold mt-1 uppercase truncate hover:whitespace-normal font-mono ${currentState === "IDLE" ? "text-slate-400" : "text-emerald-400"}`}>
              {currentState === "IDLE" ? "HEATING SEARCH" : "PIR ACTIVE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
