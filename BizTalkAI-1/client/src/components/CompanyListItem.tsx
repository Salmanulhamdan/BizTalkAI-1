import { type Ainager } from "@shared/schema";
import { formatAinagerName } from "@/lib/utils";

interface CompanyListItemProps {
  ainager: Ainager;
  onClick: (ainager: Ainager) => void;
}

export default function CompanyListItem({ ainager, onClick }: CompanyListItemProps) {
  const displayName = formatAinagerName(ainager.ainagerName);
  const initial = displayName.charAt(0).toUpperCase();
  
  return (
    <button
      onClick={() => onClick(ainager)}
      className="group w-full flex items-center gap-3 sm:gap-4 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-primary/5 active:scale-[0.99] border border-transparent hover:border-primary/20 touch-manipulation min-h-[56px] sm:min-h-[60px]"
      data-testid={`item-company-${ainager.ainagerName.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary font-bold text-sm sm:text-base">
          {initial}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-card"></div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <h3 className="font-semibold text-foreground truncate text-sm sm:text-[15px] leading-tight">
          {displayName}
        </h3>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
          Business Assistant
        </p>
      </div>
    </button>
  );
}
