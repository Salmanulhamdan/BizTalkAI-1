import { type Ainager } from "@shared/schema";
import { Phone } from "lucide-react";

interface CompanyListItemProps {
  ainager: Ainager;
  onClick: (ainager: Ainager) => void;
}

export default function CompanyListItem({ ainager, onClick }: CompanyListItemProps) {
  const initial = ainager.ainagerName.charAt(0).toUpperCase();
  
  return (
    <button
      onClick={() => onClick(ainager)}
      className="group w-full flex items-center gap-4 py-3.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:bg-primary/5 active:scale-[0.99] border border-transparent hover:border-primary/20"
      data-testid={`item-company-${ainager.ainagerName.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary font-bold text-base">
          {initial}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <h3 className="font-semibold text-foreground truncate text-[15px] leading-tight">
          {ainager.ainagerName}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Business Assistant
        </p>
      </div>
      
      {/* Call Button */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 group-hover:bg-primary group-hover:scale-110 flex items-center justify-center transition-all duration-200">
        <Phone className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
      </div>
    </button>
  );
}
