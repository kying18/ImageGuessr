import { z } from "zod";

export const IFileSchema = z.object({
  url: z.string(),
  source_type: z.enum(["real", "generated"]),
});

export type IFile = z.infer<typeof IFileSchema>;
