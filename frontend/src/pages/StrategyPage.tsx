import { useI18n } from "../i18n/I18n";
import { useState } from "react";
import type { SolveJob, SolveResult } from "../api/types";
import { Panel, downloadJSON } from "../components/ui";
import { BoardCards } from "../features/board/BoardPicker";
import { HANDS } from "../features/board/cards";
import { ComboInspector } from "../features/strategy/ComboInspector";
import { StrategyBar, actionColor } from "../features/strategy/StrategyBar";

export function StrategyPage({
  result,
  job,
}: {
  result: SolveResult;
  job: SolveJob;
}) {
  const { t, number, percent, actionLabel, nodeName } = useI18n();
  const [nodeId, setNodeId] = useState("root");
  const [hand, setHand] = useState("AKs");
  const node = result.nodes.find((n) => n.id === nodeId) ?? result.nodes[0];
  const classes = new Map(node.classes.map((c) => [c.hand_class, c]));
  const actualHand =
    classes.has(hand) || node.dead_combos.some((c) => c.hand_class === hand)
      ? hand
      : (node.classes[0]?.hand_class ?? hand);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("Average strategy · {count} iterations", {
              count: number(result.iterations, 0),
            })}
          </span>
          <h1>{t("Strategy")}</h1>
        </div>
        <div className="heading-actions">
          <BoardCards board={job.config.board} small />
          <button
            className="button"
            onClick={() =>
              downloadJSON(
                { config: job.config, result },
                `riverline-${job.id}.json`,
              )
            }
          >
            {t("Export JSON")}
          </button>
        </div>
      </div>
      <div className="node-toolbar">
        <label className="field">
          <span>{t("Game tree")}</span>
          <select
            aria-label={t("Game tree node")}
            value={node.id}
            onChange={(e) => setNodeId(e.target.value)}
          >
            {result.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {nodeName(n)}
              </option>
            ))}
          </select>
        </label>
        <p className="mono muted">
          {node.player} EV <strong>{number(node.ev)} bb</strong>{" "}
          <span className="divider">/</span> {t("Exploitability")}{" "}
          {percent(result.exploitability_pct, 4)} {t("of pot")}
        </p>
      </div>
      <div className="node-summary">
        {node.actions.map((a) => (
          <div key={a.id} style={{ borderTopColor: actionColor(a) }}>
            <span className="caption">
              {actionLabel(a)}
              {a.amount > 0 ? ` · ${number(a.amount)} bb` : ""}
            </span>
            <strong className="mono">
              {node.strategy[a.id] == null
                ? "—"
                : percent(node.strategy[a.id]! * 100, 1)}
            </strong>
          </div>
        ))}
      </div>
      <div className="workspace strategy-workspace">
        <div className="stack">
          <Panel
            title={t("Hand matrix")}
            aside={
              <span className="mono caption">
                {node.player} ·{" "}
                {t("{count} live combos", {
                  count: number(node.combos.length, 0),
                })}
              </span>
            }
          >
            <div className="legend">
              {node.actions.map((a) => (
                <span key={a.id}>
                  <i style={{ backgroundColor: actionColor(a) }} />
                  {actionLabel(a)}
                </span>
              ))}
              <span>
                <i className="absent" />
                {t("Not in range")}
              </span>
            </div>
            <div className="scroll-box">
              <div
                className="range-grid strategy-grid"
                role="group"
                aria-label={t("Strategy matrix")}
              >
                {HANDS.map((name) => {
                  const cls = classes.get(name);
                  const removed = node.dead_combos.some(
                    (c) => c.hand_class === name,
                  );
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`matrix-cell ${cls ? "has-strategy" : ""} ${name === actualHand ? "selected" : ""}`}
                      disabled={!cls && !removed}
                      aria-label={name}
                      aria-pressed={name === actualHand}
                      onClick={() => setHand(name)}
                    >
                      <span>{name}</span>
                      {cls && (
                        <StrategyBar
                          actions={node.actions}
                          frequencies={cls.strategy}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="range-footer">
              {t(
                "Frequencies are weighted by both ranges and reach at this node.",
              )}
            </div>
          </Panel>
          <Panel title={t("By starting hand class")}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Class")}</th>
                    <th>Combos</th>
                    {node.actions.map((a) => (
                      <th key={a.id}>{actionLabel(a)}</th>
                    ))}
                    <th>EV bb</th>
                  </tr>
                </thead>
                <tbody>
                  {node.classes.map((c) => (
                    <tr key={c.hand_class}>
                      <td>
                        <button
                          type="button"
                          className="text-button mono"
                          onClick={() => setHand(c.hand_class)}
                        >
                          {c.hand_class}
                        </button>
                      </td>
                      <td>{c.combos}</td>
                      {node.actions.map((a) => (
                        <td key={a.id}>
                          {c.strategy[a.id] == null
                            ? "—"
                            : percent(c.strategy[a.id]! * 100, 1)}
                        </td>
                      ))}
                      <td>{number(c.ev)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
        <aside>
          <ComboInspector
            key={`${node.id}/${actualHand}`}
            node={node}
            hand={actualHand}
          />
        </aside>
      </div>
      <p className="page-footnote">
        {t(
          "EVs are net river value minus half the initial pot. OOP + IP = 0. Exploitability is half NashConv within the configured tree; it is not a claim about unrestricted NLHE.",
        )}
      </p>
    </>
  );
}
