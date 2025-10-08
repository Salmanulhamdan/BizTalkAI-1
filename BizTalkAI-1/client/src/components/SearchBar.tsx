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
    <div className="flex gap-2 px-6 pb-5">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search assistants..."
          aria-label="Search companies"
          data-testid="input-search"
          className="w-full h-12 pl-11 pr-10 bg-muted/50 border border-input/50 rounded-2xl text-base outline-none transition-all duration-200 focus:border-primary focus:bg-background focus:shadow-lg focus:shadow-primary/10 placeholder:text-muted-foreground/50"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <Button
        onClick={onSearch}
        size="default"
        className="h-12 px-5 rounded-2xl font-semibold shrink-0 shadow-lg hover:shadow-xl transition-all duration-200"
        data-testid="button-search"
      >
        <Search className="w-4 h-4 sm:mr-2" />
        <span className="hidden sm:inline">Search</span>
      </Button>
    </div>
  );
}
