import { getById } from "@/lib/services/file";
import { transformFile } from "@/lib/transforms";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "id is required" }), {
      status: 400,
    });
  }

  const file = await getById(id);
  return new Response(JSON.stringify(transformFile(file)), { status: 200 });
}
