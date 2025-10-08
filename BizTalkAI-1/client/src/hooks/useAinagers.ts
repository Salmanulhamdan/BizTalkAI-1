import { useQuery } from "@tanstack/react-query";
import { type Ainager } from "@shared/schema";

// Response type for paginated ainagers
export interface AinagersResponse {
  ainagers: Ainager[];
  hasMore: boolean;
  total: number;
}

// API function to fetch ainagers with pagination and search
async function fetchAinagers(page: number = 1, limit: number = 10, search: string = ""): Promise<AinagersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search })
  });
  
  const response = await fetch(`/api/ainagers?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ainagers");
  }
  return response.json();
}

// API function to fetch specific ainager by ID
async function fetchAinagerById(id: string): Promise<Ainager> {
  const response = await fetch(`/api/ainagers/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ainager");
  }
  return response.json();
}

// Hook to fetch ainagers with pagination and search
export function useAinagers(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery({
    queryKey: ["ainagers", page, limit, search],
    queryFn: () => fetchAinagers(page, limit, search),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Keep showing old data while fetching new
  });
}

// Hook to fetch specific ainager by ID
export function useAinager(id: string) {
  return useQuery({
    queryKey: ["ainager", id],
    queryFn: () => fetchAinagerById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to get companies from ainagers (filtered by ainager_type = 'company')
export function useCompanies() {
  const { data, isLoading, error } = useAinagers(1, 100); // Get more for filtering
  
  const companies = data?.ainagers?.filter(ainager => ainager.ainagerType === 'company') || [];
  
  return {
    companies,
    isLoading,
    error,
  };
}
