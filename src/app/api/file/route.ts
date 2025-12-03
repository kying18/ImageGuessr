import { getById } from "@/lib/services/file";

export async function GET(request: Request) {
  const file = await getById("9446d851-0cd4-4da0-841e-fcad71c302dd");
  return new Response(JSON.stringify(file), { status: 200 });
}

