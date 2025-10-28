import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { type Ainager } from "@shared/schema";
import DirectoryHeader from "@/components/DirectoryHeader";
import SearchBar from "@/components/SearchBar";
import CompanyList from "@/components/CompanyList";
import UserProfile from "@/components/UserProfile";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAinagers } from "@/hooks/useAinagers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUp, User, LogOut } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allAinagers, setAllAinagers] = useState<Ainager[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const limit = page === 1 ? 10 : 5; // First page: 10, subsequent: 5
  const { data, isLoading, error, isFetching } = useAinagers(page, limit, debouncedSearch);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update if search value actually changed
      if (searchValue !== debouncedSearch) {
        setDebouncedSearch(searchValue);
        setPage(1); // Reset to page 1 on new search
        setAllAinagers([]); // Clear accumulated data on new search
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchValue, debouncedSearch]);
  
  // Accumulate ainagers as pages load
  useEffect(() => {
    if (data?.ainagers) {
      if (page === 1) {
        setAllAinagers(data.ainagers);
      } else {
        // Dedupe by ainagerId to prevent duplicate key warnings
        setAllAinagers(prev => {
          const existingIds = new Set(prev.map(a => a.ainagerId));
          const newAinagers = data.ainagers.filter(a => !existingIds.has(a.ainagerId));
          return [...prev, ...newAinagers];
        });
      }
    }
  }, [data, page]);

  // Scroll detection for scroll-to-top button
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      setShowScrollTop(scrollTop > 200);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleCompanyClick = (ainager: Ainager) => {
    setLocation("/chat", { state: { ainager } });
  };

  const handleShowMore = () => {
    setPage(prev => prev + 1);
  };

  const handleSearch = () => {
    // Search is handled by debounce, this is just for the button click
    setDebouncedSearch(searchValue);
    setPage(1);
    setAllAinagers([]);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <main className="w-full max-w-[480px] bg-card/95 backdrop-blur-sm shadow-2xl mx-0 sm:mx-3 my-0 sm:my-6 sm:rounded-3xl overflow-hidden flex flex-col border border-border/50">
          <div className="sticky-nav bg-card/90 backdrop-blur-md border-b border-border/50 shadow-lg flex-shrink-0">
            <DirectoryHeader />
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              onSearch={handleSearch}
            />
          </div>
          <div ref={scrollContainerRef} className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-primary/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="mt-6 text-muted-foreground font-medium">Loading assistants...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const isDatabaseError = errorMessage.toLowerCase().includes("database") || 
                           errorMessage.toLowerCase().includes("connection") ||
                           errorMessage.toLowerCase().includes("fetch");
    
    return (
      <div className="h-screen flex justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <main className="w-full max-w-[480px] bg-card/95 backdrop-blur-sm shadow-2xl mx-0 sm:mx-3 my-0 sm:my-6 sm:rounded-3xl overflow-hidden flex flex-col border border-border/50">
          <div className="sticky-nav bg-card/90 backdrop-blur-md border-b border-border/50 shadow-lg flex-shrink-0">
            <DirectoryHeader />
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              onSearch={handleSearch}
            />
          </div>
          <div ref={scrollContainerRef} className="flex-1 flex flex-col items-center justify-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 relative">
              <svg className="w-10 h-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isDatabaseError && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-destructive-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-destructive font-semibold text-center text-lg mb-2">
              {isDatabaseError ? "Database Connection Error" : "Failed to Load Assistants"}
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {isDatabaseError 
                ? "The server lost connection to the database. This may be temporary."
                : "Unable to fetch assistants. Please check your connection."
              }
            </p>
            <div className="mt-6 p-3 bg-muted/50 rounded-lg max-w-xs">
              <p className="text-xs text-muted-foreground text-center font-mono break-all">
                {errorMessage}
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="default"
              className="mt-6"
            >
              Retry Connection
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-screen flex justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <main className="w-full max-w-[480px] bg-card/95 backdrop-blur-sm shadow-2xl mx-0 sm:mx-3 my-0 sm:my-6 sm:rounded-3xl overflow-hidden flex flex-col border border-border/50">
          {/* Fixed Header */}
          <div className="sticky-nav bg-card/90 backdrop-blur-md border-b border-border/50 shadow-lg flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3">
              <DirectoryHeader />
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setShowProfile(!showProfile)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user?.firstName}</span>
                </Button>
                <Button
                  onClick={() => {
                    logout();
                    setLocation('/login');
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              onSearch={() => console.log("Search triggered")}
            />
          </div>

        {/* User Profile Section */}
        {showProfile && (
          <div className="px-4 py-3 border-b border-border/50">
            <UserProfile />
          </div>
        )}

        {/* Scrollable Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto mobile-scroll smooth-scroll scrollbar-hide">
          {/* Inline Error Banner (shown when there's data but pagination/refresh fails) */}
          {error && allAinagers.length > 0 && (
            <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 mb-2 p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-destructive">Connection Error</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {(error as Error)?.message?.toLowerCase().includes("database")
                      ? "Database connection lost. Showing cached results."
                      : "Unable to fetch new data. Showing cached results."
                    }
                  </p>
                </div>
                <Button
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 text-[10px] sm:text-xs flex-shrink-0"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          {allAinagers.length === 0 && !isLoading && debouncedSearch ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 sm:px-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium text-center text-sm sm:text-base">No assistants found</p>
              <p className="text-xs sm:text-sm text-muted-foreground/60 mt-2 text-center">Try searching with different keywords</p>
            </div>
          ) : (
            <>
              <CompanyList
                ainagers={allAinagers}
                onCompanyClick={handleCompanyClick}
              />
              
              {/* Show More Button */}
              {data?.hasMore && (
                <div className="px-4 sm:px-6 py-4 flex justify-center">
                  <Button
                    onClick={handleShowMore}
                    disabled={isFetching}
                    variant="outline"
                    className="w-full max-w-sm rounded-xl font-semibold text-sm sm:text-base h-10 sm:h-12"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Loading...</span>
                        <span className="sm:hidden">Loading</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Show More ({data.total - allAinagers.length} remaining)</span>
                        <span className="sm:hidden">Show More</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* End of List Message */}
              {!data?.hasMore && allAinagers.length > 0 && (
                <div className="px-4 sm:px-6 py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    All {allAinagers.length} assistants shown
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="scroll-to-top flex items-center justify-center"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </main>
    </div>
    </ProtectedRoute>
  );
}
