import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { points_scored, accuracy, game_id } = body;

    const { data, error } = await supabaseAdmin
      .from("game_results")
      .insert({
        points_scored,
        accuracy,
        game_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating game result:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/game-result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
