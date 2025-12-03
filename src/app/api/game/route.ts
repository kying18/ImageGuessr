import { getById } from "@/lib/services/game";
import { transformGame } from "@/lib/transforms";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "id is required" }), {
      status: 400,
    });
  }

  const game = await getById(id);
  return new Response(JSON.stringify(transformGame(game)), { status: 200 });
}
