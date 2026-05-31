import { useState } from "react";
import { Sparkles, Trash2, Calendar, ShieldCheck, Heart, ArrowRight, ShieldAlert, BadgeAlert, RefreshCw } from "lucide-react";
import { CatLog } from "../types";

interface UploadGalleryProps {
  logs: CatLog[];
  onTriggerAnalyze: (logId: string) => Promise<void>;
  onClearLogs: () => Promise<void>;
  isAnalyzingId: string | null;
  hasGeminiActive: boolean;
}

export default function UploadGallery({ logs, onTriggerAnalyze, onClearLogs, isAnalyzingId, hasGeminiActive }: UploadGalleryProps) {
  const [filter, setFilter] = useState<"ALL" | "SUCCESS" | "FALSE_ALARM">("ALL");

  const filteredLogs = logs.filter((log) => {
    if (filter === "ALL") return true;
    return log.state === filter;
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " - " + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-850 rounded-none p-6" id="upload-gallery-container">
      {/* Gallery Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <h3 className="font-mono text-xs font-bold tracking-[0.2em] uppercase text-white">
              AUTOMATED CLOUD CAPTURE MATRIX
            </h3>
          </div>
          <p className="font-sans text-[11px] text-slate-400 mt-1">
            Real uploaded / simulated footage and log transcripts sent from Pi 5
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Filter switches */}
          <div className="bg-slate-950 border border-slate-850 p-1 flex gap-1 text-[10px] uppercase font-mono font-bold tracking-widest w-full sm:w-auto">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-4 py-1.5 rounded-none transition-colors cursor-pointer ${filter === "ALL" ? "bg-white text-black font-extrabold" : "text-slate-500 hover:text-slate-300"}`}
            >
              All Runs ({logs.length})
            </button>
            <button
              onClick={() => setFilter("SUCCESS")}
              className={`px-4 py-1.5 rounded-none transition-colors cursor-pointer ${filter === "SUCCESS" ? "bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 font-extrabold" : "text-slate-500 hover:text-slate-300"}`}
            >
              Caught ({logs.filter(l => l.state === "SUCCESS").length})
            </button>
            <button
              onClick={() => setFilter("FALSE_ALARM")}
              className={`px-4 py-1.5 rounded-none transition-colors cursor-pointer ${filter === "FALSE_ALARM" ? "bg-amber-950/40 border border-amber-900/40 text-amber-500 font-extrabold" : "text-slate-500 hover:text-slate-300"}`}
            >
              False ({logs.filter(l => l.state === "FALSE_ALARM").length})
            </button>
          </div>

          <button
            onClick={onClearLogs}
            className="bg-slate-950 hover:bg-red-950/30 text-slate-400 hover:text-red-400 p-2 py-1.5 rounded-none border border-slate-850 hover:border-red-900 transition-colors uppercase font-mono font-bold text-[10px] tracking-wider flex items-center justify-center gap-1.5 ml-auto sm:ml-0 cursor-pointer"
            title="Clean logs"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-none py-12 text-center" id="empty-gallery-state">
          <BadgeAlert className="w-8 h-8 text-slate-700 mx-auto mb-3 opacity-60" />
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">No telemetry log packages found inside segment</p>
          <p className="font-sans text-[11px] text-slate-500 mt-1">Run active simulated loops or boot up the client script module.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="logs-grid">
          {filteredLogs.map((log) => {
            const isCat = log.state === "SUCCESS";
            const isLoading = isAnalyzingId === log.id;

            return (
              <div 
                key={log.id} 
                className={`bg-slate-950/70 border overflow-hidden flex flex-col justify-between transition-all rounded-none ${isCat ? 'border-slate-800 hover:border-slate-750' : 'border-slate-900/60 opacity-[0.82]'}`}
              >
                {/* Media Preview Section: Crisp sharp boxes */}
                <div className="relative aspect-video w-full bg-slate-950 group overflow-hidden">
                  <img
                    referrerPolicy="no-referrer"
                    src={log.mediaUrl}
                    alt={isCat ? "Feline capture" : "Vacant frame context"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-[1.02] duration-500 rounded-none"
                  />
                  
                  {/* Absolute badges with sharp corners */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`font-mono text-[8px] uppercase tracking-widest font-extrabold px-2.5 py-1.5 rounded-none shadow-md border ${isCat ? 'bg-emerald-950/95 border-emerald-500 text-emerald-400' : 'bg-slate-950/95 border-slate-800 text-slate-500'}`}>
                      {isCat ? "COCO CLASS 15: VALIDATED" : "VACANT / UNMATCHED"}
                    </span>
                    {isCat && (
                      <span className="font-mono text-[8px] uppercase tracking-widest bg-slate-950/95 border border-slate-800 text-amber-400 px-2.5 py-1.5 rounded-none shadow-md">
                        {Math.round(log.confidence * 100)}% Match Rate
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 rounded-none px-2.5 py-1 font-mono text-[8px] tracking-wide text-slate-400 uppercase flex items-center gap-1.5">
                    <Calendar className="w-2.5 h-2.5 text-slate-500" />
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </div>

                {/* Info Contents */}
                <div className="p-5 flex-1 flex flex-col justify-between whitespace-pre-wrap">
                  <div>
                    {/* Log Terminal dump */}
                    <div className="bg-slate-950 p-4 rounded-none border border-slate-850 mb-4 font-mono text-[11px] text-emerald-400 leading-relaxed max-h-[140px] overflow-y-auto">
                      <div className="text-[9px] tracking-wider text-slate-500 mb-1.5 flex items-center gap-1 border-b border-slate-900 pb-1.5 font-bold uppercase">
                        <span>PI 5 CORE SHELL STACK</span>
                        <span className="ml-auto text-amber-500 font-extrabold">{log.cpu_speed_mhz} MHz CLOCK</span>
                      </div>
                      {log.logMessage}
                    </div>

                    {/* Gemini behavior container */}
                    {log.behaviorAnalysis ? (
                      <div className="bg-emerald-950/5 border border-emerald-900/30 rounded-none p-4 mt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-mono font-bold text-[10px] uppercase text-slate-100 flex items-center gap-1.5 tracking-wider">
                            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                            Behavior: {log.behaviorAnalysis.title}
                          </h4>
                          <span className={`font-mono text-[8px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-none border ${log.behaviorAnalysis.intensity === "High" ? "bg-red-950/40 text-red-400 border-red-900/70" : log.behaviorAnalysis.intensity === "Medium" ? "bg-amber-950/40 text-amber-500 border-amber-900/70" : "bg-blue-950/40 text-blue-450 border border-blue-900"}`}>
                            {log.behaviorAnalysis.intensity} Focus
                          </span>
                        </div>

                        <p className="font-sans text-[11px] text-slate-300 leading-relaxed italic bg-slate-950/65 p-3.5 border border-slate-900 rounded-none">
                          &ldquo;{log.behaviorAnalysis.thoughts}&rdquo;
                        </p>

                        <div>
                          <span className="font-mono text-[9px] tracking-widest font-extrabold text-emerald-400 uppercase block mb-1">Pi Tuning Optimization recommendations:</span>
                          <p className="font-sans text-[11px] text-slate-400 leading-normal">
                            {log.behaviorAnalysis.recommendations}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Trigger analyze button */}
                  {isCat && !log.behaviorAnalysis && (
                    <div className="mt-4 border-t border-slate-900 pt-3">
                      <button
                        onClick={() => onTriggerAnalyze(log.id)}
                        disabled={isLoading}
                        className={`w-full py-2.5 px-3 rounded-none text-[10px] tracking-widest font-bold uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          isLoading 
                            ? 'bg-slate-950 text-slate-500 border-slate-800' 
                            : 'bg-white hover:bg-slate-200 text-slate-955 border-none'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Consulting Cognitive Core...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            {hasGeminiActive ? "Behavior & System Diagnosis" : "Simulate AI Behavior Analysis"}
                          </>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                      </button>
                    </div>
                  )}

                  {!isCat && (
                    <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-900">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                      <span>False alarms bypass behavior profiling. Settings optimized.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
