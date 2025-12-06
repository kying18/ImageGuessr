import { z } from "zod";

// File
export const IFileSchema = z.object({
  url: z.string(),
  source_type: z.enum(["real", "generated"]),
});
export type IFile = z.infer<typeof IFileSchema>;

// Model
export const IModelSchema = z.object({
  name: z.string(),
});
export type IModel = z.infer<typeof IModelSchema>;

// Game
export const IGameSchema = z.object({
  id: z.string(),
  date: z.string(),
});
export type IGame = z.infer<typeof IGameSchema>;

// FilePair
export const IFilePairSchema = z.object({
  real_file_id: z.string(),
  generated_file_id: z.string(),
  real_vote_count: z.number(),
  generated_vote_count: z.number(),
  game_id: z.string(),
});
export type IFilePair = z.infer<typeof IFilePairSchema>;

// GameResult
export const IGameResultSchema = z.object({
  points_scored: z.number(),
  accuracy: z.number(),
  game_id: z.string(),
});
export type IGameResult = z.infer<typeof IGameResultSchema>;

// FilePair with Files (depends on IFileSchema)
export const IFilePairWithFilesSchema = z.object({
  real_file_id: z.string(),
  generated_file_id: z.string(),
  real_vote_count: z.number(),
  generated_vote_count: z.number(),
  game_id: z.string(),
  real_file: IFileSchema,
  generated_file: IFileSchema,
});
export type IFilePairWithFiles = z.infer<typeof IFilePairWithFilesSchema>;

// Game with all details (depends on IFilePairWithFilesSchema and IGameResultSchema)
export const IGameWithDetailsSchema = z.object({
  id: z.string(),
  date: z.string(),
  file_pairs: z.array(IFilePairWithFilesSchema),
  game_results: z.array(IGameResultSchema),
});
export type IGameWithDetails = z.infer<typeof IGameWithDetailsSchema>;
