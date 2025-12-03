import { supabaseAdmin } from "../supabase";
import { File } from "../models";

export async function getById(id: string): Promise<File> {
  const { data, error } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return data as File;
}
