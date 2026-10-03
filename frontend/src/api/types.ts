export type Status =
  "queued" | "running" | "completed" | "failed" | "cancelled";
export interface SolveConfig {
  game: "NLHE";
  street: "river";
  pot: number;
  effective_stack: number;
  board: string[];
  oop_range: string;
  ip_range: string;
  tree: { oop_bet_sizes: number[]; ip_bet_sizes: number[] };
  solver: {
    algorithm: "cfr" | "cfr_plus";
    iterations: number;
    convergence_target: number | null;
  };
}
export interface SolveJob {
  id: string;
  status: Status;
  iteration: number;
  max_iterations: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  algorithm: string;
  elapsed_seconds: number;
  exploitability_pct: number | null;
  error: string | null;
  config: SolveConfig;
}
export interface Action {
  id: string;
  label: string;
  kind: string;
  amount: number;
  fraction: number;
}
export type Frequencies = Record<string, number | null>;
export interface ComboResult {
  combo: string;
  hand_class: string;
  weight: number;
  strategy: Frequencies;
  action_evs: Record<string, number | null>;
  ev: number | null;
  reach_probability: number;
  counterfactual_reach: number;
  opponent_combos_before: number;
  opponent_combos_after: number;
  opponent_weight_after: number;
  blockers: Record<string, number>;
}
export interface HandClass {
  hand_class: string;
  combos: number;
  strategy: Frequencies;
  ev: number | null;
  reach_probability: number;
}
export interface StrategyNode {
  id: string;
  player: "OOP" | "IP";
  history: string[];
  pot: number;
  actions: Action[];
  strategy: Frequencies;
  ev: number | null;
  reach_probability: number;
  combos: ComboResult[];
  classes: HandClass[];
  dead_combos: { combo: string; hand_class: string; reason: string }[];
}
export interface ConvergencePoint {
  iteration: number;
  exploitability_pct: number;
}
export interface SolveResult {
  iterations: number;
  algorithm: string;
  ev_oop: number;
  ev_ip: number;
  exploitability: number;
  exploitability_pct: number;
  converged: boolean;
  nodes: StrategyNode[];
  convergence: ConvergencePoint[];
  compatible_deals: number;
  tree_nodes: number;
  elapsed_seconds: number;
  utility_convention: string;
  engine_version: string;
}
