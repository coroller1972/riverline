import { useI18n } from "../../i18n/I18n";
import { useState } from "react";
import type { SolveConfig } from "../../api/types";
import { Arrow, Field, Panel } from "../../components/ui";

function BetSizes({
  label,
  sizes,
  onChange,
}: {
  label: string;
  sizes: number[];
  onChange: (sizes: number[]) => void;
}) {
  const { t, betSize } = useI18n();
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<"sizes" | "bounds" | null>(null);
  const choices = [...new Set([0.33, 0.75, 1.5, ...sizes])].sort(
    (a, b) => a - b,
  );
  function toggle(n: number) {
    setError(null);
    if (sizes.includes(n)) onChange(sizes.filter((s) => s !== n));
    else if (sizes.length < 3) onChange([...sizes, n].sort((a, b) => a - b));
    else setError("sizes");
  }
  function add() {
    const n = Number(custom) / 100;
    if (!Number.isFinite(n) || n <= 0 || n > 10) {
      setError("bounds");
      return;
    }
    if (!sizes.includes(n)) toggle(n);
    setCustom("");
  }
  return (
    <div className="bet-sizes">
      <label>{label}</label>
      <div className="size-row">
        {choices.map((size) => (
          <button
            key={size}
            type="button"
            className={`size-chip ${sizes.includes(size) ? "selected" : ""}`}
            aria-label={`${label} ${betSize(size)}`}
            aria-pressed={sizes.includes(size)}
            onClick={() => toggle(size)}
          >
            {betSize(size)}
          </button>
        ))}
      </div>
      <div className="add-size">
        <input
          type="number"
          aria-label={t("Custom {label}", { label })}
          min="0.01"
          max="1000"
          step="any"
          placeholder={t("Custom %")}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button type="button" className="text-button" onClick={add}>
          {t("Add size")}
        </button>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {t(
            error === "sizes"
              ? "Select at most three sizes per player."
              : "Enter a size between 0 and 1,000% of pot.",
          )}
        </p>
      )}
    </div>
  );
}
export function ConfigPanels({
  config,
  onChange,
  pending,
  disabled,
}: {
  config: SolveConfig;
  onChange: (c: SolveConfig) => void;
  pending: boolean;
  disabled: boolean;
}) {
  const { t, number } = useI18n();
  return (
    <aside className="stack">
      <Panel title={t("Stakes")}>
        <div className="field-pair">
          <Field
            label={t("Pot size")}
            value={config.pot}
            min={0.01}
            unit="bb"
            onChange={(pot) => onChange({ ...config, pot })}
          />
          <Field
            label={t("Effective stack")}
            value={config.effective_stack}
            unit="bb"
            onChange={(effective_stack) =>
              onChange({ ...config, effective_stack })
            }
          />
        </div>
        <div className="inset-row">
          <span>{t("Stack-to-pot ratio")}</span>
          <span className="mono accent">
            {number(config.effective_stack / config.pot)}
          </span>
        </div>
      </Panel>
      <Panel
        title={t("Bet tree")}
        aside={<span className="caption">{t("% of pot")}</span>}
      >
        <BetSizes
          label={t("OOP bet sizes")}
          sizes={config.tree.oop_bet_sizes}
          onChange={(sizes) =>
            onChange({
              ...config,
              tree: { ...config.tree, oop_bet_sizes: sizes },
            })
          }
        />
        <BetSizes
          label={t("IP bet sizes (vs check)")}
          sizes={config.tree.ip_bet_sizes}
          onChange={(sizes) =>
            onChange({
              ...config,
              tree: { ...config.tree, ip_bet_sizes: sizes },
            })
          }
        />
        <div className="scope-note">
          {t("Facing a bet: fold or call.")}
          <br />
          {t(
            "Bets cap at the effective stack. Raises are not supported in this MVP.",
          )}
        </div>
      </Panel>
      <Panel title={t("Solver")}>
        <Field
          label={t("Iterations")}
          value={config.solver.iterations}
          step="1"
          min={1}
          max={100000}
          unit="it"
          onChange={(iterations) =>
            onChange({ ...config, solver: { ...config.solver, iterations } })
          }
        />
        <label className="field">
          <span>{t("Algorithm")}</span>
          <select
            value={config.solver.algorithm}
            onChange={(e) =>
              onChange({
                ...config,
                solver: {
                  ...config.solver,
                  algorithm: e.target.value as "cfr" | "cfr_plus",
                },
              })
            }
          >
            <option value="cfr_plus">{t("CFR+ · linear average")}</option>
            <option value="cfr">{t("CFR · uniform average")}</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.solver.convergence_target !== null}
            onChange={(e) =>
              onChange({
                ...config,
                solver: {
                  ...config.solver,
                  convergence_target: e.target.checked ? 0.3 : null,
                },
              })
            }
          />
          {t("Stop at an exploitability target")}
        </label>
        {config.solver.convergence_target !== null && (
          <Field
            label={t("Convergence target")}
            value={config.solver.convergence_target}
            min={0.000001}
            unit={t("% pot")}
            onChange={(convergence_target) =>
              onChange({
                ...config,
                solver: { ...config.solver, convergence_target },
              })
            }
          />
        )}
        <p className="caption">
          {t("Exact card removal · deterministic traversal")}
          <br />
          {t("Python reference engine · no rake")}
        </p>
        <button
          type="submit"
          className="button primary run-button"
          disabled={pending || disabled}
        >
          <span>{pending ? t("Queueing…") : t("Run solve")}</span>
          <Arrow />
        </button>
        <span className="run-note mono">
          {t("{count} iterations · asynchronous", {
            count: number(config.solver.iterations, 0),
          })}
        </span>
      </Panel>
    </aside>
  );
}
