import { useState, useMemo, useEffect } from "react";
import { type Ainager } from "@shared/schema";
import DirectoryHeader from "@/components/DirectoryHeader";
import SearchBar from "@/components/SearchBar";
import CompanyList from "@/components/CompanyList";
import VoiceModal from "@/components/VoiceModal";
import { useAinagers } from "@/hooks/useAinagers";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAinager, setSelectedAinager] = useState<Ainager | null>(null);
  const [page, setPage] = useState(1);
  const [allAinagers, setAllAinagers] = useState<Ainager[]>([]);
  
  const limit = page === 1 ? 10 : 5; // First page: 10, subsequent: 5
  const { data, isLoading, error, isFetching } = useAinagers(page, limit, debouncedSearch);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setPage(1); // Reset to page 1 on new search
      setAllAinagers([]); // Clear accumulated data on new search
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchValue]);
  
  // Accumulate ainagers as pages load
  useEffect(() => {
    if (data?.ainagers) {
      if (page === 1) {
        setAllAinagers(data.ainagers);
      } else {
        setAllAinagers(prev => [...prev, ...data.ainagers]);
      }
    }
  }, [data, page]);

  const handleCompanyClick = (ainager: Ainager) => {
    setSelectedAinager(ainager);
  };

  const handleCloseModal = () => {
    setSelectedAinager(null);
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
      <div className="min-h-screen flex justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <main className="w-full max-w-[480px] bg-card/95 backdrop-blur-sm shadow-2xl mx-3 my-0 sm:my-6 sm:rounded-3xl overflow-hidden flex flex-col border border-border/50">
          <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border/50 shadow-sm">
            <DirectoryHeader />
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              onSearch={handleSearch}
            />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-20">
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
      <div className="min-h-screen flex justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <main className="w-full max-w-[480px] bg-card/95 backdrop-blur-sm shadow-2xl mx-3 my-0 sm:my-6 sm:rounded-3xl overflow-hidden flex flex-col border border-border/50">
          <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border/50 shadow-sm">
            <DirectoryHeader />
            <SearchBar
              value={searchValue}
              onChange={setSearchValue}
              onSearch={handleSearch}
            />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
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
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-background via-muted/20 to-background">
      <main className="w-full max-w-[480px] bg-card/95 backdrop-blur-sm shadow-2xl mx-3 my-0 sm:my-6 sm:rounded-3xl overflow-hidden flex flex-col border border-border/50">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border/50 shadow-lg">
          <DirectoryHeader />
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSearch={() => console.log("Search triggered")}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Inline Error Banner (shown when there's data but pagination/refresh fails) */}
          {error && allAinagers.length > 0 && (
            <div className="mx-4 mt-4 mb-2 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Connection Error</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {error instanceof Error && error.message.toLowerCase().includes("database")
                      ? "Database connection lost. Showing cached results."
                      : "Unable to fetch new data. Showing cached results."
                    }
                  </p>
                </div>
                <Button
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          {allAinagers.length === 0 && !isLoading && debouncedSearch ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium text-center">No assistants found</p>
              <p className="text-sm text-muted-foreground/60 mt-2 text-center">Try searching with different keywords</p>
            </div>
          ) : (
            <>
              <CompanyList
                ainagers={allAinagers}
                onCompanyClick={handleCompanyClick}
              />
              
              {/* Show More Button */}
              {data?.hasMore && (
                <div className="px-6 py-4 flex justify-center">
                  <Button
                    onClick={handleShowMore}
                    disabled={isFetching}
                    variant="outline"
                    className="w-full max-w-sm rounded-xl font-semibold"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Show More (${data.total - allAinagers.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
              
              {/* End of List Message */}
              {!data?.hasMore && allAinagers.length > 0 && (
                <div className="px-6 py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    All {allAinagers.length} assistants shown
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selectedAinager && (
        <VoiceModal
          ainager={selectedAinager}
          isOpen={!!selectedAinager}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
