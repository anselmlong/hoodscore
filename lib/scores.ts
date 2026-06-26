import type { AreaScore, Dimension, PlanningArea } from "../types";

// Import static JSON data (bundled at build time by Next.js)
import scoresData from "../data/scores.json";
import areasData from "../data/areas.json";

const scores = scoresData as AreaScore[];
const areas = areasData as PlanningArea[];

// Default equal weight for each dimension
export const DIMENSIONS: Dimension[] = [
  "transit",
  "food",
  "schools",
  "green",
  "safety",
  "affordability",
];

const DIMENSION_SET = new Set<string>(DIMENSIONS);

export const MAX_COMPARE_AREAS = 8;

const DEFAULT_WEIGHTS: Record<Dimension, number> = {
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
    const rawWeight = w[d.dimension] ?? 1.0;
    const weight =
      typeof rawWeight === "number" && Number.isFinite(rawWeight)
        ? rawWeight
        : 1.0;
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
  const uniqueSlugs = Array.from(new Set(slugs)).slice(0, MAX_COMPARE_AREAS);
  return uniqueSlugs
    .map((slug) => getAreaScore(slug, weights))
    .filter((s): s is AreaScore => s !== undefined);
}

export function getKnownSlugs(): Set<string> {
  return new Set(scores.map((s) => s.area.slug));
}

export function validateSlugs(slugs: unknown): {
  ok: true;
  slugs: string[];
} | {
  ok: false;
  error: string;
} {
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return { ok: false, error: "Missing or invalid 'slugs' array in request body" };
  }

  if (slugs.some((slug) => typeof slug !== "string" || slug.trim().length === 0)) {
    return { ok: false, error: "All entries in 'slugs' must be non-empty strings" };
  }

  const uniqueSlugs = Array.from(new Set(slugs.map((slug) => slug.trim())));
  if (uniqueSlugs.length > MAX_COMPARE_AREAS) {
    return { ok: false, error: `Compare supports up to ${MAX_COMPARE_AREAS} areas` };
  }

  const knownSlugs = getKnownSlugs();
  const unknown = uniqueSlugs.filter((slug) => !knownSlugs.has(slug));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown planning area slug: ${unknown.join(", ")}` };
  }

  return { ok: true, slugs: uniqueSlugs };
}

export function sanitizeWeights(
  raw: unknown
): Record<Dimension, number> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const result = { ...DEFAULT_WEIGHTS };
  let hasWeight = false;
  for (const [key, value] of Object.entries(raw)) {
    if (!DIMENSION_SET.has(key)) return undefined;
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    if (value < 0 || value > 3) return undefined;
    result[key as Dimension] = Math.round(value * 10) / 10;
    hasWeight = true;
  }

  return hasWeight ? result : undefined;
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
    return sanitizeWeights(parsed);
  } catch {
    // Invalid JSON: ignore.
  }
  return undefined;
}

/**
 * All 55 planning areas in basic form (no scores).
 */
export function getAllPlanningAreas(): PlanningArea[] {
  return areas;
}
