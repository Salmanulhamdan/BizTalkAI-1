import { type Ainager } from "@shared/schema";
import CompanyListItem from "./CompanyListItem";

interface CompanyListProps {
  ainagers: Ainager[];
  onCompanyClick: (ainager: Ainager) => void;
}

export default function CompanyList({ ainagers, onCompanyClick }: CompanyListProps) {
  return (
    <div className="px-5 py-3" data-testid="list-companies">
      {/* Section Header */}
      <div className="px-2 pb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Assistants
        </h2>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
          {ainagers.length}
        </span>
      </div>

      {/* List */}
      <div className="space-y-1">
        {ainagers.map((ainager) => (
          <CompanyListItem
            key={ainager.ainagerId}
            ainager={ainager}
            onClick={onCompanyClick}
          />
        ))}
      </div>
    </div>
  );
}
