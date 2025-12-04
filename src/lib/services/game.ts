import { supabaseAdmin } from "../supabase";
import { GameWithDetails } from "../models";

export async function getByDate(date: string): Promise<GameWithDetails> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select(
      `
      *,
      file_pairs (
        *,
        real_file:files!file_pairs_real_file_id_fkey (*),
        generated_file:files!file_pairs_generated_file_id_fkey (*)
      ),
      game_results (*)
    `
    )
    .eq("date", date)
    .single();

  if (error) {
    throw error;
  }

  return data as GameWithDetails;
}
