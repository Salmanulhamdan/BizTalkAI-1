import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export default function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="flex gap-2 px-4 sm:px-6 pb-4 sm:pb-5 touch-manipulation">
      <div className="relative flex-1">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search assistants..."
          aria-label="Search companies"
          data-testid="input-search"
          className="w-full h-10 sm:h-12 pl-9 sm:pl-11 pr-9 sm:pr-10 bg-muted/50 border border-input/50 rounded-xl sm:rounded-2xl text-sm sm:text-base outline-none transition-all duration-200 focus:border-primary focus:bg-background focus:shadow-lg focus:shadow-primary/10 placeholder:text-muted-foreground/50 touch-manipulation"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors touch-manipulation"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <Button
        onClick={onSearch}
        size="default"
        className="h-10 sm:h-12 px-3 sm:px-5 rounded-xl sm:rounded-2xl font-semibold shrink-0 shadow-lg hover:shadow-xl transition-all duration-200 touch-manipulation min-w-[50px] sm:min-w-[60px]"
        data-testid="button-search"
      >
        <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
        <span className="hidden sm:inline">Search</span>
      </Button>
    </div>
  );
}
