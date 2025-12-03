import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { typedFetch } from "../typedFetch";
import { IFile, IFileSchema } from "../types";

export function useFile(
  id: string,
  options?: Omit<UseQueryOptions<IFile>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["file", id],
    queryFn: () => typedFetch(`/api/file?id=${id}`, IFileSchema),
    ...options,
  });
}
