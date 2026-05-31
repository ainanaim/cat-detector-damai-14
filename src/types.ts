export interface CatLog {
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

export interface HardwareConfig {
  pirPin: number;
  fanSpeedThreshold: number; // For Argon One case fan
  detectionConfidence: number; // 0.60 defaults
  captureDuration: number; // in seconds
  cameraResolution: "800x600" | "1280x720" | "1920x1080";
  sleepModeTargetFreq: "powersave" | "ondemand" | "performance";
}

export type PiSystemState = "IDLE" | "WAKE_UP" | "INFERENCE" | "DETECTED" | "SLEEPING_COOLING";
