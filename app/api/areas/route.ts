import { NextRequest, NextResponse } from "next/server";
import { getAreaScore, parseWeightsParam, getAllPlanningAreas } from "@/lib/scores";

/**
 * GET /api/areas
 *
 * With ?slug=ang-mo-kio: returns a single AreaScore with dimension breakdown.
 * Without slug: returns basic info for all 55 planning areas.
 *
 * Optional: weights (JSON string) for custom scoring.
 *
 * Response: { data: AreaScore } or { data: { areas: PlanningArea[] } }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const weightsRaw = searchParams.get("weights");
    const weights = parseWeightsParam(weightsRaw);
    if (weightsRaw && !weights) {
      return NextResponse.json(
        { error: "Invalid weights. Use known dimensions with numeric values from 0 to 3." },
        { status: 400 }
      );
    }

    if (slug) {
      const areaScore = getAreaScore(slug, weights);
      if (!areaScore) {
        return NextResponse.json(
          { error: `Planning area not found: ${slug}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: areaScore }, { status: 200 });
    }

    // No slug: return all areas basic info
    const areas = getAllPlanningAreas();
    return NextResponse.json({ data: { areas } }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch areas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
