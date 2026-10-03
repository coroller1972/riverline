import { useI18n } from "../../i18n/I18n";
import { useMemo, useState } from "react";
import { ErrorMessage, Panel } from "../../components/ui";
import { HANDS, blocked, handClass } from "../board/cards";
import { parseRange, setClassWeight } from "./range";

export function RangeEditor({
  oop,
  ip,
  board,
  onChange,
}: {
  oop: string;
  ip: string;
  board: string[];
  onChange: (player: "oop" | "ip", text: string) => void;
}) {
  const { t, number, percent } = useI18n();
  const [player, setPlayer] = useState<"oop" | "ip">("oop");
  const [brush, setBrush] = useState(1);
  const text = player === "oop" ? oop : ip;
  const parsed = useMemo(() => {
    try {
      return { entries: parseRange(text), error: null };
    } catch (error) {
      return { entries: new Map<string, number>(), error };
    }
  }, [text]);
  const summaries = useMemo(() => {
    const map = new Map<
      string,
      { weight: number; live: number; total: number }
    >();
    for (const [combo, weight] of parsed.entries) {
      const cls = handClass(combo),
        entry = map.get(cls) ?? { weight: 0, live: 0, total: 0 };
      entry.total++;
      if (!blocked(combo, board)) {
        entry.weight += weight;
        entry.live++;
      }
      map.set(cls, entry);
    }
    return map;
  }, [parsed, board]);
  const live = [...parsed.entries].filter(([c]) => !blocked(c, board));
  return (
    <Panel
      title={t("Ranges")}
      aside={
        <div className="brush">
          <span className="caption">{t("Brush weight")}</span>
          {[1, 0.75, 0.5, 0.25, 0].map((w) => (
            <button
              key={w}
              type="button"
              aria-label={t("Brush {weight}", { weight: percent(w * 100, 0) })}
              aria-pressed={brush === w}
              className={brush === w ? "active" : ""}
              onClick={() => setBrush(w)}
            >
              {w * 100}
            </button>
          ))}
        </div>
      }
    >
      <div className="range-toolbar">
        <div className="segmented" aria-label={t("Range player")}>
          <button
            type="button"
            aria-pressed={player === "oop"}
            onClick={() => setPlayer("oop")}
          >
            OOP <span>{t("Out of position")}</span>
          </button>
          <button
            type="button"
            aria-pressed={player === "ip"}
            onClick={() => setPlayer("ip")}
          >
            IP <span>{t("In position")}</span>
          </button>
        </div>
        <span className="mono caption">
          {t("{weight} weighted · {count} live", {
            weight: number(live.reduce((n, [, w]) => n + w, 0)),
            count: number(live.length, 0),
          })}
        </span>
      </div>
      <div className="scroll-box">
        <div
          className="range-grid"
          role="group"
          aria-label={t("{player} range matrix", {
            player: player.toUpperCase(),
          })}
        >
          {HANDS.map((cls) => {
            const entry = summaries.get(cls);
            return (
              <button
                key={cls}
                type="button"
                className={`matrix-cell ${entry ? "in-range" : ""}`}
                aria-pressed={!!entry}
                aria-label={cls}
                title={t("{hand}: {live} live / {total} selected combos", {
                  hand: cls,
                  live: entry?.live ?? 0,
                  total: entry?.total ?? 0,
                })}
                style={
                  entry
                    ? {
                        background: `rgba(217, 193, 143, ${0.12 + Math.min(entry.weight / Math.max(entry.live, 1), 1) * 0.5})`,
                      }
                    : undefined
                }
                disabled={!!parsed.error}
                onClick={() =>
                  onChange(
                    player,
                    setClassWeight(text, cls, entry && brush === 1 ? 0 : brush),
                  )
                }
              >
                {cls}
                {entry && <span className="cell-count">{entry.live}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <label className="field range-string">
        <span>
          {t("{player} range string", { player: player.toUpperCase() })}
        </span>
        <textarea
          aria-label={t("{player} range string", {
            player: player.toUpperCase(),
          })}
          value={text}
          onChange={(e) => onChange(player, e.target.value)}
          spellCheck={false}
          rows={3}
        />
      </label>
      <ErrorMessage error={parsed.error} />
      <p className="caption">
        {t(
          "AA, AKs, AKo, AhKh · weights: AKs:0.75 · no + or interval shorthand.",
        )}
      </p>
      <div className="range-footer">
        <span>
          {t("Card removal: {count} combos blocked by the board", {
            count: number(parsed.entries.size - live.length, 0),
          })}
        </span>
        <button
          className="text-button"
          type="button"
          onClick={() => onChange(player, "")}
        >
          {t("Clear range")}
        </button>
      </div>
    </Panel>
  );
}
