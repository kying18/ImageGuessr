import { z } from "zod";

export async function typedFetch<T extends z.ZodType>(
  url: string,
  schema: T,
  init?: RequestInit
): Promise<z.infer<T>> {
  const res = await fetch(url, init);

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }

  const json = await res.json();
  return schema.parse(json);
}
