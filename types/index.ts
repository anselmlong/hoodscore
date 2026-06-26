export interface PlanningArea {
  id: number;
  slug: string;
  name: string;
  region: string;
  population?: number;
}

export interface DimensionScore {
  dimension: string;
  label: string;
  score: number; // 0-100
  rawValue: number | null;
  unit: string;
  description: string;
}

export interface AreaScore {
  area: PlanningArea;
  overall: number;
  dimensions: DimensionScore[];
}

export type Dimension = "transit" | "food" | "schools" | "green" | "safety" | "affordability";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  transit: "Transit",
  food: "Food",
  schools: "Schools",
  green: "Green Space",
  safety: "Safety",
  affordability: "Affordability",
};

export const DIMENSION_UNITS: Record<Dimension, string> = {
  transit: "stops & stations within 1km",
  food: "hawker centres within 1km",
  schools: "schools within 2km",
  green: "% green coverage",
  safety: "crimes per 10,000 residents",
  affordability: "median resale price (S$)",
};
