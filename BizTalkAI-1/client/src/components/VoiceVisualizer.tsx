import { useEffect, useState } from "react";

interface VoiceVisualizerProps {
  state: "idle" | "connecting" | "listening" | "speaking" | "error";
  companyInitial: string;
}

export default function VoiceVisualizer({ state, companyInitial }: VoiceVisualizerProps) {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (state === "listening" || state === "speaking") {
      const interval = setInterval(() => {
        setPulseScale(prev => prev === 1 ? 1.1 : 1);
      }, 800);
      return () => clearInterval(interval);
    } else {
      setPulseScale(1);
    }
  }, [state]);

  const getStateColor = () => {
    switch (state) {
      case "connecting":
        return "border-primary bg-primary/10";
      case "listening":
        return "border-primary bg-primary/20";
      case "speaking":
        return "border-chart-2 bg-chart-2/20";
      case "error":
        return "border-destructive bg-destructive/20";
      default:
        return "border-border bg-muted/30";
    }
  };

  return (
    <div className="flex items-center justify-center flex-1">
      <div
        className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${getStateColor()}`}
        style={{
          transform: `scale(${pulseScale})`,
        }}
        data-testid="visualizer-voice"
      >
        <div className="text-6xl font-bold text-foreground/60">
          {companyInitial}
        </div>
        {state === "connecting" && (
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        )}
      </div>
    </div>
  );
}
