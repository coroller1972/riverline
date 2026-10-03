import { useI18n } from "../i18n/I18n";
import { useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { api } from "../api/client";
import type { SolveConfig, SolveJob } from "../api/types";
import { Panel, StatusPill, downloadJSON } from "../components/ui";
import { BoardPicker } from "../features/board/BoardPicker";
import { RangeEditor } from "../features/ranges/RangeEditor";
import { ConfigPanels } from "../features/solver-config/ConfigPanels";
import { DEMO_CONFIG } from "../features/solver-config/defaults";

export function SetupPage({
  config,
  onChange,
  onSubmit,
  onOpen,
  pending,
  disabled,
}: {
  config: SolveConfig;
  onChange: (config: SolveConfig) => void;
  onSubmit: () => void;
  onOpen: (job: SolveJob) => void;
  pending: boolean;
  disabled: boolean;
}) {
  const { t, number } = useI18n();
  const recent = useQuery({
    queryKey: ["solves"],
    queryFn: api.list,
    refetchInterval: 10000,
    retry: 1,
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t("Heads-up · River · OOP first to act")}
          </span>
          <h1>{t("Spot setup")}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="button"
            onClick={() => onChange(structuredClone(DEMO_CONFIG))}
          >
            {t("Load quick preset")}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => downloadJSON(config, "riverline-spot.json")}
          >
            {t("Save spot")}
          </button>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="workspace">
          <div className="stack">
            <BoardPicker
              board={config.board}
              onChange={(board) => onChange({ ...config, board })}
            />
            <RangeEditor
              oop={config.oop_range}
              ip={config.ip_range}
              board={config.board}
              onChange={(player, text) =>
                onChange({
                  ...config,
                  [player === "oop" ? "oop_range" : "ip_range"]: text,
                })
              }
            />
          </div>
          <ConfigPanels
            config={config}
            onChange={onChange}
            pending={pending}
            disabled={
              disabled ||
              config.board.length !== 5 ||
              !config.oop_range.trim() ||
              !config.ip_range.trim()
            }
          />
        </div>
      </form>
      <Panel
        title={t("Recent solves")}
        className="recent-solves"
        aside={
          <span className="caption">{t("Persisted runs · latest 25")}</span>
        }
      >
        {recent.isError ? (
          <p className="caption">
            {t("Cannot reach the API. Start the stack to launch a solve.")}
          </p>
        ) : recent.isPending ? (
          <p className="caption">{t("Loading saved runs…")}</p>
        ) : recent.data.length === 0 ? (
          <p className="caption">
            {t(
              "Your first solve will appear here. Configure a spot or load the quick preset.",
            )}
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("Run")}</th>
                  <th>{t("Board")}</th>
                  <th>{t("Iterations")}</th>
                  <th>{t("Status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.data.map((job) => (
                  <tr key={job.id}>
                    <td>{job.id.slice(0, 8)}</td>
                    <td>{job.config.board.join(" ")}</td>
                    <td>{number(job.iteration, 0)}</td>
                    <td>
                      <StatusPill
                        status={job.status}
                        percent={(job.iteration / job.max_iterations) * 100}
                      />
                    </td>
                    <td>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onOpen(job)}
                      >
                        {t("Open run")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="page-footnote">
        {t(
          "River only · Heads-up · No rake · Up to 3 bet sizes per player · Raises not supported · Exact reference solver, up to 20,000 compatible deals and 300,000 tree nodes.",
        )}
      </p>
    </>
  );
}
