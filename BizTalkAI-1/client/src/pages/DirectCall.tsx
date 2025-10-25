import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import ChatPage from "@/pages/ChatPage";
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
    const isDatabaseError = error.toLowerCase().includes("database") || 
                           error.toLowerCase().includes("connection") ||
                           error.toLowerCase().includes("failed to fetch");
    
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6 relative">
            <AlertCircle className="w-10 h-10 text-destructive" />
            {isDatabaseError && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-destructive-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold mb-3">
            {isDatabaseError ? "Database Connection Error" : "Ainager Not Found"}
          </h2>
          <p className="text-muted-foreground mb-2">{error}</p>
          {isDatabaseError && (
            <p className="text-sm text-muted-foreground/80 mb-4">
              The server lost connection to the database. This may be temporary.
            </p>
          )}
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

  // Success - show chat page
  if (ainager) {
    // Set the ainager in history state for ChatPage to access
    history.replaceState({ ainager }, '', window.location.href);
    return <ChatPage />;
  }

  return null;
}



