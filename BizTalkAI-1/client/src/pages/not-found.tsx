import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="w-full max-w-lg">
        <div className="relative">
          {/* Decorative Elements */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-destructive/10 rounded-full blur-3xl"></div>
          
          {/* Main Content */}
          <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 rounded-3xl shadow-2xl p-10 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 mb-6">
              <SearchX className="w-12 h-12 text-destructive" />
            </div>
            
            {/* Title */}
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              404
            </h1>
            
            {/* Subtitle */}
            <h2 className="text-2xl font-semibold mb-3 text-foreground">
              Page Not Found
            </h2>
            
            {/* Description */}
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved. 
              Let's get you back on track.
            </p>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
            
            {/* Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <p className="mt-8 text-xs text-muted-foreground/60 border-t border-border/50 pt-6">
                💡 Dev tip: Did you forget to add the route to the router?
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
