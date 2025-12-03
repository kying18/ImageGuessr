import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { typedFetch } from "../typedFetch";
import { IModel, IModelSchema } from "../types";

export function useModel(
  id: string,
  options?: Omit<UseQueryOptions<IModel>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["model", id],
    queryFn: () => typedFetch(`/api/model?id=${id}`, IModelSchema),
    ...options,
  });
}
