import { supabaseAdmin } from "../supabase";
import { FilePair } from "../models";

export async function getById(id: string): Promise<FilePair> {
  const { data, error } = await supabaseAdmin
    .from("file_pairs")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return data as FilePair;
}
