import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { typedFetch } from "../typedFetch";
import { IGameWithDetails, IGameWithDetailsSchema } from "../types";

export function useGame(
  options?: Omit<UseQueryOptions<IGameWithDetails>, "queryKey" | "queryFn">
) {
  // Get current date in UTC for cache key
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["game", today],
    queryFn: () => typedFetch("/api/game", IGameWithDetailsSchema),
    ...options,
  });
}
