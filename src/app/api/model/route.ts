import { getById } from "@/lib/services/model";
import { transformModel } from "@/lib/transforms";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "id is required" }), {
      status: 400,
    });
  }

  const model = await getById(id);
  return new Response(JSON.stringify(transformModel(model)), { status: 200 });
}
