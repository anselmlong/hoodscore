import { NextRequest, NextResponse } from "next/server";
import { compareAreas } from "@/lib/scores";

/**
 * POST /api/compare
 *
 * Compares two or more planning areas side by side.
 * Expects JSON body: { slugs: string[], weights?: Record<string, number> }
 *
 * Response: { data: { comparison: AreaScore[] } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate slugs
    const slugs: string[] = body?.slugs;
    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid 'slugs' array in request body" },
        { status: 400 }
      );
    }

    if (slugs.some((s) => typeof s !== "string")) {
      return NextResponse.json(
        { error: "All entries in 'slugs' must be strings" },
        { status: 400 }
      );
    }

    const weights: Record<string, number> | undefined = body?.weights;
    const comparison = compareAreas(slugs, weights);

    if (comparison.length === 0) {
      return NextResponse.json(
        { error: "No matching planning areas found for the given slugs" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { comparison } }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compare areas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}