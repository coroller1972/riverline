import { useI18n } from "../i18n/I18n";
import { useEffect, useState } from "react";
import type { ConvergencePoint, SolveJob, SolveResult } from "../api/types";
import { active } from "../api/client";
import { Arrow, ErrorMessage, Panel } from "../components/ui";
import { BoardCards } from "../features/board/BoardPicker";
import { ConvergenceChart } from "../features/strategy/ConvergenceChart";

export function SolvePage({
  job,
  result,
  connection,
  onCancel,
  onStrategy,
  onRerun,
  cancelPending,
}: {
  job: SolveJob;
  result?: SolveResult;
  connection: string;
  onCancel: () => void;
  onStrategy: () => void;
  onRerun: () => void;
  cancelPending: boolean;
}) {
  const { t, number, percent: formatPercent, time } = useI18n();
  const [samples, setSamples] = useState<ConvergencePoint[]>([]);
  useEffect(() => {
    if (job.exploitability_pct !== null)
      setSamples((points) =>
        points.some((p) => p.iteration === job.iteration)
          ? points
          : [
              ...points,
              {
                iteration: job.iteration,
                exploitability_pct: job.exploitability_pct!,
              },
            ],
      );
  }, [job.iteration, job.exploitability_pct]);
  const percent = (job.iteration / job.max_iterations) * 100;
  const title =
    job.status === "running"
      ? t("Solving")
      : job.status === "queued"
        ? t("In the queue")
        : job.status === "completed"
          ? t("Solve complete")
          : job.status === "cancelled"
            ? t("Solve cancelled")
            : t("Solve failed");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("Run")} {job.id.slice(0, 8)} · {time(job.created_at)}
          </span>
          <h1>{title}</h1>
        </div>
        <div className="heading-actions">
          <BoardCards board={job.config.board} small />
          {active(job.status) ? (
            <button
              type="button"
              className="button danger"
              disabled={cancelPending}
              onClick={onCancel}
            >
              {cancelPending ? t("Stopping…") : t("Stop")}
            </button>
          ) : (
            <button type="button" className="button" onClick={onRerun}>
              {t("Run again")}
            </button>
          )}
          {job.status === "completed" && (
            <button
              type="button"
              className="button primary"
              disabled={!result}
              onClick={onStrategy}
            >
              {t("Inspect strategy")} <Arrow />
            </button>
          )}
        </div>
      </div>
      <ErrorMessage error={job.error} />
      <Panel className="progress-panel">
        <div className="progress-hero">
          <div>
            <span className="iteration-number">{number(job.iteration, 0)}</span>
            <span className="mono muted">
              {" "}
              /{" "}
              {t("{count} iterations", {
                count: number(job.max_iterations, 0),
              })}
            </span>
          </div>
          <div className="exploitability">
            <span className="eyebrow">{t("Exploitability")}</span>
            <strong>
              {number(job.exploitability_pct, 4)}
              <small> {t("% of pot")}</small>
            </strong>
            <span className="caption">
              {result?.converged
                ? t("Target reached")
                : job.config.solver.convergence_target !== null
                  ? t("Target {value}", {
                      value: formatPercent(
                        job.config.solver.convergence_target,
                      ),
                    })
                  : t("Fixed iteration budget")}
            </span>
          </div>
        </div>
        <div
          className={`progress-track ${job.status === "running" ? "live" : ""}`}
          role="progressbar"
          aria-label={t("Solve progress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div style={{ width: `${percent}%` }} />
        </div>
        <div className="progress-caption mono">
          <span>
            {t("{progress} of iteration budget", {
              progress: formatPercent(percent, 1),
            })}
          </span>
          <span>
            {job.status === "queued"
              ? t("Waiting for a worker")
              : active(job.status)
                ? t(
                    connection === "live"
                      ? "WebSocket connected · updates throttled"
                      : "Polling fallback · updates throttled",
                  )
                : t("Saved in PostgreSQL")}
          </span>
        </div>
      </Panel>
      <div className="stat-strip">
        <div>
          <span className="eyebrow">{t("Elapsed")}</span>
          <strong className="mono">
            {number(job.elapsed_seconds, 1)} <small>s</small>
          </strong>
        </div>
        <div>
          <span className="eyebrow">{t("Iterations / s")}</span>
          <strong className="mono">
            {job.elapsed_seconds > 0
              ? number(job.iteration / job.elapsed_seconds, 1)
              : "—"}
          </strong>
        </div>
        <div>
          <span className="eyebrow">{t("Algorithm")}</span>
          <strong className="mono">
            {job.algorithm === "cfr_plus" ? "CFR+" : "CFR"}
          </strong>
        </div>
        <div>
          <span className="eyebrow">{t("Compatible deals")}</span>
          <strong className="mono">
            {result ? number(result.compatible_deals, 0) : "—"}
          </strong>
        </div>
      </div>
      <div className="workspace">
        <Panel
          title={t("Convergence")}
          aside={
            <span className="caption">{t("Exploitability · log scale")}</span>
          }
        >
          <ConvergenceChart
            points={result?.convergence ?? samples}
            maxIterations={job.max_iterations}
            target={job.config.solver.convergence_target}
          />
        </Panel>
        <Panel title={t("Run details")}>
          <dl className="details-list">
            <div>
              <dt>{t("Board")}</dt>
              <dd className="mono">{job.config.board.join(" ")}</dd>
            </div>
            <div>
              <dt>{t("Pot / stack")}</dt>
              <dd className="mono">
                {number(job.config.pot)} / {number(job.config.effective_stack)}{" "}
                bb
              </dd>
            </div>
            <div>
              <dt>{t("Tree nodes")}</dt>
              <dd className="mono">
                {result ? number(result.tree_nodes, 0) : "—"}
              </dd>
            </div>
            <div>
              <dt>{t("Execution")}</dt>
              <dd>{t("Celery worker")}</dd>
            </div>
          </dl>
          <p className="caption">
            {t(
              "Exact best responses measure the average strategy within this betting tree. Completing the iteration budget does not imply convergence.",
            )}
          </p>
        </Panel>
      </div>
    </>
  );
}
