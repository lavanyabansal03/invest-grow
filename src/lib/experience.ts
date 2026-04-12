export type ExperienceLevel = "beginner" | "intermediate" | "pro";

/**
 * Maps self-reported level to confidence_score on profiles (0–100 per DB constraint).
 */
export function confidenceScoreForLevel(level: ExperienceLevel): number {
  switch (level) {
    case "beginner":
      return 28;
    case "intermediate":
      return 58;
    case "pro":
      return 88;
    default:
      return 40;
  }
}
