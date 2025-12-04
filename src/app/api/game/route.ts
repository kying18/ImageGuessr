import { getByDate } from "@/lib/services/game";
import { transformGameWithDetails } from "@/lib/transforms";

export async function GET(request: Request) {
  // Get current date in UTC (YYYY-MM-DD format)
  const today = new Date().toISOString().split("T")[0];

  const game = await getByDate(today);
  return new Response(JSON.stringify(transformGameWithDetails(game)), {
    status: 200,
  });
}
