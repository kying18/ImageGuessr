import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { typedFetch } from "../typedFetch";
import { IGameResult, IGameResultSchema } from "../types";

export function useGameResult(
  id: string,
  options?: Omit<UseQueryOptions<IGameResult>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["gameResult", id],
    queryFn: () => typedFetch(`/api/game-result?id=${id}`, IGameResultSchema),
    ...options,
  });
}
