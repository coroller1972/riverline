import { useI18n } from "../../i18n/I18n";
import { useState } from "react";
import type { StrategyNode } from "../../api/types";
import { Panel } from "../../components/ui";
import { PlayingCard } from "../board/BoardPicker";
import { StrategyBar, actionColor } from "./StrategyBar";

export function ComboInspector({
  node,
  hand,
}: {
  node: StrategyNode;
  hand: string;
}) {
  const { t, number, percent, actionLabel } = useI18n();
  const combos = node.combos.filter((c) => c.hand_class === hand);
  const dead = node.dead_combos.filter((c) => c.hand_class === hand);
  const [selected, setSelected] = useState("");
  const combo = combos.find((c) => c.combo === selected) ?? combos[0];
  return (
    <Panel className="inspector">
      <span className="eyebrow">{t("Combo inspector")}</span>
      <div className="inspector-heading">
        <h2>{hand}</h2>
        <span className="mono caption">
          {t(combos.length === 1 ? "1 live" : "{count} live", {
            count: number(combos.length, 0),
          })}
          {" · "}
          {t(dead.length === 1 ? "1 removed" : "{count} removed", {
            count: number(dead.length, 0),
          })}
        </span>
      </div>
      <div className="combo-list">
        {dead.map((c) => (
          <div key={c.combo} className="dead-combo">
            <s className="mono">{c.combo}</s>
            <span>
              {c.reason === "board" ? t("Dead · board") : t("No opponent")}
            </span>
          </div>
        ))}
        {combos.map((c) => (
          <button
            key={c.combo}
            type="button"
            className={`combo-row ${combo?.combo === c.combo ? "selected" : ""}`}
            aria-label={c.combo}
            aria-pressed={combo?.combo === c.combo}
            onClick={() => setSelected(c.combo)}
          >
            <span className="mini-hand">
              <PlayingCard card={c.combo.slice(0, 2)} small />
              <PlayingCard card={c.combo.slice(2)} small />
            </span>
            <span className="combo-mixture">
              <StrategyBar actions={node.actions} frequencies={c.strategy} />
              <span className="mono caption">
                {node.actions
                  .map((a) =>
                    percent(
                      c.strategy[a.id] == null ? null : c.strategy[a.id]! * 100,
                      1,
                    ),
                  )
                  .join(" / ")}
              </span>
            </span>
          </button>
        ))}
      </div>
      {combo ? (
        <>
          <div className="combo-ev">
            <span className="mono">{combo.combo}</span>
            <span>
              EV{" "}
              <strong className="mono">
                {number(combo.ev)} <small>bb</small>
              </strong>
            </span>
          </div>
          <div className="table-scroll">
            <table className="action-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>{t("Freq")}</th>
                  <th>EV bb</th>
                </tr>
              </thead>
              <tbody>
                {node.actions.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <i style={{ background: actionColor(a) }} />
                      {actionLabel(a)}
                    </td>
                    <td>
                      {percent(
                        combo.strategy[a.id] == null
                          ? null
                          : combo.strategy[a.id]! * 100,
                        1,
                      )}
                    </td>
                    <td>{number(combo.action_evs[a.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {combo.counterfactual_reach <= 1e-15 && (
            <p className="caption">
              {t(
                "The opponent never reaches this node against this combo. Conditional EVs are undefined.",
              )}
            </p>
          )}
          <div className="blockers">
            <span className="eyebrow">
              {t("Blockers · vs {player} range", {
                player: node.player === "OOP" ? "IP" : "OOP",
              })}
            </span>
            {Object.entries(combo.blockers).map(([card, count]) => (
              <div key={card}>
                <span className="mini-hand">
                  <PlayingCard card={card} small />
                  <span>{t("removes")}</span>
                </span>
                <span className="mono">
                  {number(count)} <small>{t("weighted combos")}</small>
                </span>
              </div>
            ))}
            <div className="blocker-total">
              <span>{t("Compatible opponent combos")}</span>
              <span className="mono">
                {number(combo.opponent_combos_before, 0)} →{" "}
                {number(combo.opponent_combos_after, 0)}
              </span>
            </div>
            <p className="caption">
              {t(
                "Per-card counts can overlap. The total counts each blocked combo once.",
              )}
            </p>
          </div>
        </>
      ) : (
        <p className="muted">{t("No playable combos in this hand class.")}</p>
      )}
    </Panel>
  );
}
