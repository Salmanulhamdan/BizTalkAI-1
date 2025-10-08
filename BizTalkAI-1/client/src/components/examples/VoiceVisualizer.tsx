import VoiceVisualizer from "../VoiceVisualizer";
import { useState } from "react";

export default function VoiceVisualizerExample() {
  const [state, setState] = useState<"idle" | "connecting" | "listening" | "speaking" | "error">("listening");

  return (
    <div className="h-96 flex flex-col">
      <VoiceVisualizer state={state} companyInitial="A" />
      <div className="flex gap-2 justify-center mt-4">
        <button onClick={() => setState("idle")} className="px-3 py-1 bg-muted rounded">Idle</button>
        <button onClick={() => setState("connecting")} className="px-3 py-1 bg-muted rounded">Connect</button>
        <button onClick={() => setState("listening")} className="px-3 py-1 bg-muted rounded">Listen</button>
        <button onClick={() => setState("speaking")} className="px-3 py-1 bg-muted rounded">Speak</button>
      </div>
    </div>
  );
}
