import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { file_pair_id, voted_for_real } = body;

    // Get current vote counts
    const { data: filePair, error: fetchError } = await supabaseAdmin
      .from("file_pairs")
      .select("real_vote_count, generated_vote_count")
      .eq("id", file_pair_id)
      .single();

    if (fetchError) {
      console.error("Error fetching file pair:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Increment the appropriate vote count
    const updates = voted_for_real
      ? { real_vote_count: filePair.real_vote_count + 1 }
      : { generated_vote_count: filePair.generated_vote_count + 1 };

    const { data, error } = await supabaseAdmin
      .from("file_pairs")
      .update(updates)
      .eq("id", file_pair_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating file pair:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/file-pair:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
