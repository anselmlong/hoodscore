import { NextRequest, NextResponse } from "next/server";
import { getAllScores } from "@/lib/scores";
import { parseWeightsParam } from "@/lib/scores";

/**
 * GET /api/scores
 *
 * Returns all 55 planning areas with overall scores.
 * Optional query param: weights (JSON string like '{"transit":1.5,"food":0.8}')
 *
 * Response: { data: { areas: AreaScore[] } }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weightsRaw = searchParams.get("weights");
    const weights = parseWeightsParam(weightsRaw);
    if (weightsRaw && !weights) {
      return NextResponse.json(
        { error: "Invalid weights. Use known dimensions with numeric values from 0 to 3." },
        { status: 400 }
      );
    }

    const areas = getAllScores(weights);

    return NextResponse.json(
      { data: { areas } },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch scores";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
