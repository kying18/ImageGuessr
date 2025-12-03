import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { typedFetch } from "../typedFetch";
import { IGame, IGameSchema } from "../types";

export function useGame(
  id: string,
  options?: Omit<UseQueryOptions<IGame>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["game", id],
    queryFn: () => typedFetch(`/api/game?id=${id}`, IGameSchema),
    ...options,
  });
}
