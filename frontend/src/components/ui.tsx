import { useI18n } from "../i18n/I18n";
import type { ReactNode } from "react";
import type { Status } from "../api/types";

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
export function Logo() {
  return (
    <div className="wordmark">
      <svg width="29" height="29" viewBox="0 0 29 29" aria-hidden="true">
        <path d="M2 9v11" stroke="#3a4742" strokeWidth="3" />
        <path d="M7 8v13" stroke="#46554f" strokeWidth="3" />
        <path d="M12 7v15" stroke="#55655e" strokeWidth="3" />
        <path d="M17 6v17" stroke="#6b7c74" strokeWidth="3" />
        <path d="M23 3v23" stroke="#d9c18f" strokeWidth="3" />
      </svg>
      <span>Riverline</span>
    </div>
  );
}
export function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
export function StatusPill({
  status,
  percent,
}: {
  status?: Status;
  percent?: number;
}) {
  const { t, percent: formatPercent } = useI18n();
  return (
    <span role="status" className={`status ${status ?? "idle"}`}>
      <i />
      {status === "running"
        ? t("Solving · {progress}", {
            progress: formatPercent(percent ?? 0, 0),
          })
        : t(status ?? "Idle")}
    </span>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  const { errorMessage } = useI18n();
  if (!error) return null;
  return (
    <div className="error-message" role="alert">
      {errorMessage(error)}
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  unit,
  min = 0,
  step = "any",
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  min?: number;
  step?: string;
  max?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-wrap">
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step={step}
          required
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) =>
            onChange(e.target.value === "" ? NaN : Number(e.target.value))
          }
        />
        {unit && <span>{unit}</span>}
      </span>
    </label>
  );
}
export function downloadJSON(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
