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
  score: z.number(),
  game_id: z.string(),
});
export type IGameResult = z.infer<typeof IGameResultSchema>;
