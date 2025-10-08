import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import VoiceModal from "@/components/VoiceModal";
import { Loader2, AlertCircle } from "lucide-react";
import { type Ainager } from "@shared/schema";

export default function DirectCall() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const ainagerName = params.ainagerName;
  
  const [ainager, setAinager] = useState<Ainager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAinager() {
      if (!ainagerName) {
        setError("No ainager name provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Search for ainager by name (case-insensitive)
        const response = await fetch(`/api/ainagers?search=${encodeURIComponent(ainagerName)}&limit=1`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch ainager");
        }

        const data = await response.json();
        
        // Check if we found an exact match (case-insensitive)
        const foundAinager = data.ainagers?.find(
          (a: Ainager) => a.ainagerName.toLowerCase() === ainagerName.toLowerCase()
        );

        if (foundAinager) {
          setAinager(foundAinager);
          setError(null);
        } else {
          setError(`Ainager "${ainagerName}" not found`);
          // Redirect to home after 3 seconds
          setTimeout(() => {
            setLocation("/");
          }, 3000);
        }
      } catch (err) {
        console.error("Error fetching ainager:", err);
        setError("Failed to load ainager. Please try again.");
        // Redirect to home after 3 seconds
        setTimeout(() => {
          setLocation("/");
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAinager();
  }, [ainagerName, setLocation]);

  const handleClose = () => {
    setLocation("/");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading {ainagerName}...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Ainager Not Found</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to home page...
          </p>
          <div className="mt-6">
            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-primary animate-[shrink_3s_linear]"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  // Success - show voice modal
  if (ainager) {
    return (
      <VoiceModal
        ainager={ainager}
        isOpen={true}
        onClose={handleClose}
      />
    );
  }

  return null;
}

