import { supabaseAdmin } from "../supabase";
import { GameResult } from "../models";

export async function getById(id: string): Promise<GameResult> {
  const { data, error } = await supabaseAdmin
    .from("game_results")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return data as GameResult;
}
