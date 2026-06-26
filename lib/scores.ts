import type { AreaScore, PlanningArea } from "../types";

// Import static JSON data (bundled at build time by Next.js)
import scoresData from "../data/scores.json";
import areasData from "../data/areas.json";

const scores = scoresData as AreaScore[];
const areas = areasData as PlanningArea[];

// Default equal weight for each dimension
const DEFAULT_WEIGHTS: Record<string, number> = {
  transit: 1.0,
  food: 1.0,
  schools: 1.0,
  green: 1.0,
  safety: 1.0,
  affordability: 1.0,
};

/**
 * Compute the weighted overall score (0-100) from dimension scores.
 */
export function computeOverall(
  dimensions: { dimension: string; score: number }[],
  weights?: Record<string, number>
): number {
  const w = weights ?? {};
  let totalWeight = 0;
  let weightedSum = 0;

  for (const d of dimensions) {
    const weight = w[d.dimension] ?? 1.0;
    weightedSum += d.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Return all 55 planning areas with overall scores.
 */
export function getAllScores(weights?: Record<string, number>): AreaScore[] {
  if (!weights) return scores;
  return scores.map((s) => ({
    ...s,
    overall: computeOverall(s.dimensions, weights),
  }));
}

/**
 * Return a single planning area with dimension breakdown and overall score.
 */
export function getAreaScore(
  slug: string,
  weights?: Record<string, number>
): AreaScore | undefined {
  const area = scores.find((s) => s.area.slug === slug);
  if (!area) return undefined;
  if (!weights) return area;
  return { ...area, overall: computeOverall(area.dimensions, weights) };
}

/**
 * Compare two or more areas side by side.
 */
export function compareAreas(
  slugs: string[],
  weights?: Record<string, number>
): AreaScore[] {
  return slugs
    .map((slug) => getAreaScore(slug, weights))
    .filter((s): s is AreaScore => s !== undefined);
}

/**
 * Parse a JSON-encoded weights string from query params.
 */
export function parseWeightsParam(
  raw: string | null
): Record<string, number> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, number>;
    }
  } catch {
    // Invalid JSON — ignore
  }
  return undefined;
}

/**
 * All 55 planning areas in basic form (no scores).
 */
export function getAllPlanningAreas(): PlanningArea[] {
  return areas;
}