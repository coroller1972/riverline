import { useI18n } from "../../i18n/I18n";
import type { ConvergencePoint } from "../../api/types";

export function ConvergenceChart({
  points,
  maxIterations,
  target,
}: {
  points: ConvergencePoint[];
  maxIterations: number;
  target: number | null;
}) {
  const { t, number } = useI18n();
  if (points.length < 2)
    return (
      <div className="chart-empty">
        <span className="muted">
          {t("Collecting convergence measurements")}
        </span>
        <p className="caption">
          {t("Exact best-response checks appear as the solve progresses.")}
        </p>
      </div>
    );
  const low = Math.min(
    ...points.map((p) => Math.max(p.exploitability_pct, 1e-8)),
    target ?? Infinity,
  );
  const high = Math.max(...points.map((p) => p.exploitability_pct), low * 10);
  const logMin = Math.log10(low) - 0.25,
    logMax = Math.log10(high) + 0.15;
  const y = (n: number) =>
    210 - ((Math.log10(Math.max(n, 1e-8)) - logMin) / (logMax - logMin)) * 180;
  const x = (n: number) => 55 + (n / maxIterations) * 625;
  const path = points
    .map(
      (p, i) => `${i ? "L" : "M"} ${x(p.iteration)} ${y(p.exploitability_pct)}`,
    )
    .join(" ");
  return (
    <svg
      className="convergence-chart"
      viewBox="0 0 710 255"
      role="img"
      aria-label={t(
        "Exploitability from {start} to {end} percent of pot. Logarithmic scale.",
        {
          start: number(points[0].exploitability_pct, 4),
          end: number(points.at(-1)!.exploitability_pct, 4),
        },
      )}
    >
      {[0, 0.5, 1].map((t) => {
        const v = 10 ** (logMin + t * (logMax - logMin));
        return (
          <g key={t}>
            <line x1="55" x2="680" y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x="45" y={y(v) + 4} textAnchor="end">
              {number(v, v < 0.01 ? 4 : 2)}
            </text>
          </g>
        );
      })}
      {target !== null && (
        <line
          x1="55"
          x2="680"
          y1={y(target)}
          y2={y(target)}
          className="chart-target"
        />
      )}
      <path
        d={`${path} L ${x(points.at(-1)!.iteration)} 210 L ${x(points[0].iteration)} 210 Z`}
        fill="var(--champagne)"
        fillOpacity="0.07"
      />
      <path d={path} fill="none" stroke="var(--champagne)" strokeWidth="2" />
      <circle
        cx={x(points.at(-1)!.iteration)}
        cy={y(points.at(-1)!.exploitability_pct)}
        r="4"
        fill="var(--champagne)"
      />
      <text x="55" y="240">
        0
      </text>
      <text x="680" y="240" textAnchor="end">
        {number(maxIterations, 0)} it
      </text>
    </svg>
  );
}
