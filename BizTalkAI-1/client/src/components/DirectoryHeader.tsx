import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export default function DirectoryHeader() {
  const [isFriend, setIsFriend] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setIsFriend(prev => !prev);
        setOpacity(1);
      }, 180);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative px-6 py-5 touch-manipulation">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"></div>
      
      <div className="relative flex items-center gap-4">
        {/* Gradient Avatar with Animation */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg ring-2 ring-primary/20">
            H
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card shadow-sm"></div>
        </div>
        
        {/* Text Content */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Hainager
            </h1>
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground whitespace-nowrap font-medium">
            Enterprise{" "}
            <span
              style={{ opacity, transition: "opacity 0.25s ease" }}
              className="inline-block text-primary font-semibold"
            >
              {isFriend ? "Friend" : "Front"}
            </span>{" "}
            Ainager
          </p>
        </div>
      </div>
    </div>
  );
}
