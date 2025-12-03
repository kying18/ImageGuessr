import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { typedFetch } from "../typedFetch";
import { IFilePair, IFilePairSchema } from "../types";

export function useFilePair(
  id: string,
  options?: Omit<UseQueryOptions<IFilePair>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["filePair", id],
    queryFn: () => typedFetch(`/api/file-pair?id=${id}`, IFilePairSchema),
    ...options,
  });
}
