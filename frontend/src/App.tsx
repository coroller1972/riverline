import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { active, api } from "./api/client";
import type { SolveConfig, SolveJob } from "./api/types";
import { useSolve } from "./api/useSolve";
import { ErrorMessage, Logo, StatusPill } from "./components/ui";
import { initialConfig } from "./features/solver-config/defaults";
import { parseRange } from "./features/ranges/range";
import { SetupPage } from "./pages/SetupPage";
import { SolvePage } from "./pages/SolvePage";
import { StrategyPage } from "./pages/StrategyPage";
import { I18nProvider, LanguageSwitcher, useI18n } from "./i18n/I18n";
import "./styles.css";

type Page = "setup" | "solve" | "strategy";
function storedId() {
  try {
    return localStorage.getItem("riverline-last-solve");
  } catch {
    return null;
  }
}
export function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
function AppContent() {
  const { t, number } = useI18n();
  const [config, setConfig] = useState<SolveConfig>(initialConfig);
  const [id, setId] = useState<string | null>(storedId);
  const [page, setPage] = useState<Page>(() =>
    storedId() ? "solve" : "setup",
  );
  const [validation, setValidation] = useState<Error | null>(null);
  const client = useQueryClient();
  const { job, result, connection } = useSolve(id);
  function selectId(nextId: string) {
    setId(nextId);
    try {
      localStorage.setItem("riverline-last-solve", nextId);
    } catch {
      /* Optional persistence. */
    }
  }
  function change(next: SolveConfig) {
    setConfig(next);
    setValidation(null);
    try {
      localStorage.setItem("riverline-draft-v1", JSON.stringify(next));
    } catch {
      /* Optional persistence. */
    }
  }
  const create = useMutation({
    mutationFn: api.create,
    onSuccess: (response) => {
      selectId(response.id);
      setPage("solve");
      void client.invalidateQueries({ queryKey: ["solves"] });
    },
  });
  const cancel = useMutation({
    mutationFn: () => api.cancel(id!),
    onSuccess: (data) => {
      client.setQueryData(["solve", id], data);
      void client.invalidateQueries({ queryKey: ["solves"] });
    },
  });
  function launch(next: SolveConfig) {
    try {
      if (!parseRange(next.oop_range).size || !parseRange(next.ip_range).size)
        throw new Error("Select at least one combo in each range.");
      setValidation(null);
      create.mutate(next);
    } catch (error) {
      setValidation(error as Error);
    }
  }
  function open(run: SolveJob) {
    selectId(run.id);
    change(run.config);
    setPage(run.status === "completed" ? "strategy" : "solve");
  }
  const displayConfig =
    page === "setup" ? config : (job.data?.config ?? config);
  return (
    <>
      <header className="app-header">
        <Logo />
        <nav aria-label={t("Workflow")}>
          {(["setup", "solve", "strategy"] as Page[]).map((step, i) => (
            <button
              key={step}
              type="button"
              aria-label={`${i + 1} ${t(step === "setup" ? "Setup" : step === "solve" ? "Solve" : "Strategy")}`}
              aria-current={page === step ? "step" : undefined}
              disabled={
                step === "solve"
                  ? !id
                  : step === "strategy"
                    ? !result.data
                    : false
              }
              onClick={() => setPage(step)}
            >
              <span>{i + 1}</span>
              {step === "setup"
                ? t("Setup")
                : step === "solve"
                  ? t("Solve")
                  : t("Strategy")}
            </button>
          ))}
        </nav>
        <span className="spot-summary mono">
          Pot {number(displayConfig.pot, 0)} · Eff.{" "}
          {number(displayConfig.effective_stack, 0)} bb · SPR{" "}
          {number(displayConfig.effective_stack / displayConfig.pot)}
        </span>
        <StatusPill
          status={job.data?.status}
          percent={
            job.data ? (job.data.iteration / job.data.max_iterations) * 100 : 0
          }
        />
        <LanguageSwitcher />
      </header>
      <main>
        <ErrorMessage error={validation ?? create.error ?? cancel.error} />
        {page === "setup" ? (
          <SetupPage
            config={config}
            onChange={change}
            onSubmit={() => launch(config)}
            onOpen={open}
            pending={create.isPending}
            disabled={active(job.data?.status)}
          />
        ) : (
          <>
            <ErrorMessage error={job.error ?? result.error} />
            {job.isPending ? (
              <div className="loading-state">{t("Loading solve…")}</div>
            ) : (
              job.data &&
              (page === "strategy" && result.data ? (
                <StrategyPage
                  key={job.data.id}
                  result={result.data}
                  job={job.data}
                />
              ) : (
                <SolvePage
                  key={job.data.id}
                  job={job.data}
                  result={result.data}
                  connection={connection}
                  onCancel={() => cancel.mutate()}
                  onStrategy={() => setPage("strategy")}
                  onRerun={() => launch(job.data!.config)}
                  cancelPending={cancel.isPending}
                />
              ))
            )}
          </>
        )}
      </main>
      <footer>
        <Logo />
        <span>{t("Every river, solved to the last combo.")}</span>
        <span className="mono">{t("Reference engine · v0.1")}</span>
      </footer>
    </>
  );
}
