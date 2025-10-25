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
    <div className="relative px-4 sm:px-6 py-4 sm:py-5 touch-manipulation">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"></div>
      
      <div className="relative flex items-center gap-3 sm:gap-4">
        {/* Gradient Avatar with Animation */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-xl sm:text-2xl shadow-lg ring-2 ring-primary/20">
            H
          </div>
          <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-card shadow-sm"></div>
        </div>
        
        {/* Text Content */}
        <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text truncate">
              Hainager
            </h1>
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary animate-pulse flex-shrink-0" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap font-medium truncate">
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
