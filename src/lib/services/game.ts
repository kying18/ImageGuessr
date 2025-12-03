import { supabaseAdmin } from "../supabase";
import { Game } from "../models";

export async function getById(id: string): Promise<Game> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return data as Game;
}
