import { NextRequest, NextResponse } from "next/server";
import { compareAreas, sanitizeWeights, validateSlugs } from "@/lib/scores";

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
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 10_000) {
      return NextResponse.json(
        { error: "Request body is too large" },
        { status: 413 }
      );
    }

    const body = await request.json();
    const validatedSlugs = validateSlugs(body?.slugs);

    if (!validatedSlugs.ok) {
      return NextResponse.json(
        { error: validatedSlugs.error },
        { status: 400 }
      );
    }

    const weights = sanitizeWeights(body?.weights);
    if (body?.weights !== undefined && !weights) {
      return NextResponse.json(
        { error: "Invalid weights. Use known dimensions with numeric values from 0 to 3." },
        { status: 400 }
      );
    }

    const comparison = compareAreas(validatedSlugs.slugs, weights);

    return NextResponse.json({ data: { comparison } }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to compare areas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
