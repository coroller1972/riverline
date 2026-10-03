import type { SolveConfig } from "../../api/types";
export const DEFAULT_CONFIG: SolveConfig = {
  game: "NLHE",
  street: "river",
  pot: 64,
  effective_stack: 168,
  board: ["Ks", "9h", "7d", "4h", "2c"],
  oop_range: "AA,KK,QQ,AKs,AQs,65s",
  ip_range: "AA,KK,QQ,JJ,AKs,AQs,AJs",
  tree: { oop_bet_sizes: [0.75], ip_bet_sizes: [0.75] },
  solver: { algorithm: "cfr_plus", iterations: 2000, convergence_target: null },
};
export const DEMO_CONFIG: SolveConfig = {
  ...DEFAULT_CONFIG,
  board: ["Qs", "8h", "4h", "2c", "7d"],
  oop_range: "AhAd,KhKd,6h5h",
  ip_range: "AsAc,KsKc,QhQd",
  pot: 100,
  effective_stack: 100,
};
export function initialConfig(): SolveConfig {
  try {
    const saved = JSON.parse(
      localStorage.getItem("riverline-draft-v1") ?? "null",
    );
    if (
      saved?.game === "NLHE" &&
      saved?.street === "river" &&
      Array.isArray(saved?.board) &&
      saved?.tree &&
      saved?.solver
    )
      return saved;
  } catch {
    /* Recover from unavailable storage or a malformed draft. */
  }
  return structuredClone(DEFAULT_CONFIG);
}
