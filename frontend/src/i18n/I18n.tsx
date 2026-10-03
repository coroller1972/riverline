import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Action, StrategyNode } from "../api/types";
import { ApiError } from "../api/errors";
import { fr, type Message } from "./messages";

export type Locale = "en" | "fr";
export const LOCALE_KEY = "riverline-locale-v1";
type Params = Record<string, string | number>;

export function resolveLocale(
  saved: string | null,
  browserLanguage: string,
): Locale {
  if (saved === "fr" || saved === "en") return saved;
  return browserLanguage.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function initialLocale(): Locale {
  let saved = null;
  try {
    saved = localStorage.getItem(LOCALE_KEY);
  } catch {
    /* Optional persistence. */
  }
  return resolveLocale(saved, navigator.language);
}

export function translations(locale: Locale) {
  const intlLocale = locale === "fr" ? "fr-FR" : "en-US";
  const formatters = new Map<number, Intl.NumberFormat>();
  function number(value: number | null | undefined, digits = 2): string {
    if (value == null || !Number.isFinite(value)) return "—";
    let formatter = formatters.get(digits);
    if (!formatter) {
      formatter = new Intl.NumberFormat(intlLocale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
      formatters.set(digits, formatter);
    }
    return formatter.format(value);
  }
  const percent = (value: number | null | undefined, digits = 1) =>
    value == null || !Number.isFinite(value)
      ? "—"
      : `${number(value, digits)}${locale === "fr" ? "\u00a0" : ""}%`;
  // Match the engine's six significant digits, including fractional bet sizes.
  const betFormatter = new Intl.NumberFormat(intlLocale, {
    style: "percent",
    maximumSignificantDigits: 6,
  });
  const betSize = (fraction: number) => betFormatter.format(fraction);
  function t(message: Message, params: Params = {}): string {
    const template = locale === "fr" ? fr[message] : message;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      String(params[name] ?? match),
    );
  }
  function actionLabel(action: Action) {
    if (action.kind === "allin") return t("All-in");
    if (action.kind === "bet")
      return t("Bet {size}", { size: betSize(action.fraction) });
    switch (action.kind) {
      case "check":
        return t("Check");
      case "fold":
        return t("Fold");
      case "call":
        return t("Call");
      default:
        return action.label;
    }
  }
  function nodeName(node: StrategyNode) {
    if (node.id === "root") return t("OOP · Root");
    return t("{player} vs {history}", {
      player: node.player,
      history: node.history
        .map((action) =>
          action.startsWith("bet_")
            ? t("Bet {size}", {
                size: betSize(Number(action.slice(4))),
              })
            : t("Check"),
        )
        .join(" → "),
    });
  }
  function cardName(card: string) {
    const suits: Record<string, Message> = {
      s: "spades",
      h: "hearts",
      d: "diamonds",
      c: "clubs",
    };
    return t("{rank} of {suit}", { rank: card[0], suit: t(suits[card[1]]) });
  }
  function errorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    if (locale === "en") return raw;
    if (error instanceof ApiError && error.issues.length) {
      const fields: Record<string, Message> = {
        pot: "Pot size",
        effective_stack: "Effective stack",
        board: "Board",
        iterations: "Iterations",
        convergence_target: "Convergence target",
        algorithm: "Algorithm",
        oop_bet_sizes: "OOP bet sizes",
        ip_bet_sizes: "IP bet sizes (vs check)",
      };
      return error.issues
        .map((issue) => {
          const field = issue.loc
            .filter((part) => part !== "body")
            .map((part) =>
              fields[String(part)] ? t(fields[String(part)]) : String(part),
            )
            .join(" · ");
          const bounds: Record<string, Message> = {
            greater_than: "Must be greater than {limit}.",
            greater_than_equal: "Must be at least {limit}.",
            less_than: "Must be less than {limit}.",
            less_than_equal: "Must be at most {limit}.",
          };
          let detail: string;
          if (bounds[issue.type]) {
            const limit = Object.values(issue.ctx ?? {}).find(
              (value) => typeof value === "number",
            );
            detail = t(bounds[issue.type], {
              limit:
                typeof limit === "number"
                  ? new Intl.NumberFormat(intlLocale).format(limit)
                  : "—",
            });
          } else if (issue.type === "int_type" || issue.type === "int_parsing")
            detail = t("Enter an integer.");
          else if (
            issue.type === "finite_number" ||
            issue.type === "float_parsing"
          )
            detail = t("Enter a finite number.");
          else if (issue.type === "missing")
            detail = t("This field is required.");
          else detail = errorMessage(issue.msg);
          return field ? `${field} : ${detail}` : detail;
        })
        .join("\n");
    }
    // API validation may prefix domain errors with a field path and "Value error, ".
    return raw
      .split("\n")
      .map((line) => {
        const message = line.replace(/^.*?Value error, /, "");
        if (Object.hasOwn(fr, message)) return fr[message as Message];
        let match = message.match(/^Invalid (?:weight|weighted token): (.+)$/);
        if (match) return t("Invalid weight: {token}", { token: match[1] });
        match = message.match(
          /^Unsupported range token: (.+)\. Use AA, AKs, AKo or AhKh\.$/,
        );
        if (match)
          return t(
            "Unsupported range token: {token}. Use AA, AKs, AKo or AhKh.",
            { token: match[1] },
          );
        match = message.match(/^Request failed \((\d+)\)$/);
        if (match) return t("Request failed ({status})", { status: match[1] });
        match = message.match(
          /^Results unavailable: solve is (queued|running|completed|failed|cancelled)$/,
        );
        if (match)
          return t("Results unavailable: {status}", {
            status: t(match[1] as Message),
          });
        match = message.match(
          /^Reference solver limit: ([\d,]+) (compatible deals|nodes); .+$/,
        );
        if (match)
          return t(
            "Reference solver capacity exceeded; narrow ranges or reduce bet sizes",
          );
        // Keep unexpected diagnostic details available rather than hiding server failures.
        return t("Error details: {details}", { details: line });
      })
      .join("\n");
  }
  return {
    locale,
    t,
    number,
    percent,
    betSize,
    actionLabel,
    nodeName,
    cardName,
    errorMessage,
    time: (date: string) =>
      new Date(date).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-GB"),
  };
}

const I18nContext = createContext({
  ...translations("en"),
  setLocale: (_locale: Locale) => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const value = useMemo(
    () => ({ ...translations(locale), setLocale }),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = value.t("Riverline — River solver");
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* Optional persistence. */
    }
  }, [locale, value]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="language-switch" role="group" aria-label={t("Language")}>
      {(["fr", "en"] as const).map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          aria-label={language === "fr" ? "Français" : "English"}
          aria-pressed={locale === language}
          onClick={() => setLocale(language)}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
