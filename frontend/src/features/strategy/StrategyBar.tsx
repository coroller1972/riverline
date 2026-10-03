import { useI18n } from "../../i18n/I18n";
import type { Action, Frequencies } from "../../api/types";

export function actionColor(action: Action) {
  const token =
    action.kind === "bet"
      ? action.fraction <= 0.5
        ? "bet-s"
        : action.fraction <= 1
          ? "bet-m"
          : "bet-l"
      : action.kind;
  return `var(--action-${token})`;
}
export function StrategyBar({
  actions,
  frequencies,
  className = "",
}: {
  actions: Action[];
  frequencies: Frequencies;
  className?: string;
}) {
  const { t, percent, actionLabel } = useI18n();
  return (
    <div
      className={`strategy-bar ${className}`}
      role="img"
      aria-label={actions
        .map(
          (a) =>
            `${actionLabel(a)}: ${frequencies[a.id] == null ? t("unreachable") : percent(frequencies[a.id]! * 100, 1)}`,
        )
        .join(", ")}
    >
      {actions.map((a) => (
        <span
          key={a.id}
          style={{
            width: `${(frequencies[a.id] ?? 0) * 100}%`,
            backgroundColor: actionColor(a),
          }}
        />
      ))}
    </div>
  );
}
