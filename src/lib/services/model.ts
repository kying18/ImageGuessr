import { supabaseAdmin } from "../supabase";
import { Model } from "../models";

export async function getById(id: string): Promise<Model> {
  const { data, error } = await supabaseAdmin
    .from("models")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return data as Model;
}
