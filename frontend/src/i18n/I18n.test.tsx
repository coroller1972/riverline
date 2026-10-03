import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "../App";
import { api } from "../api/client";
import { ApiError } from "../api/errors";
import type { SolveJob, SolveResult } from "../api/types";
import { DEFAULT_CONFIG } from "../features/solver-config/defaults";
import fixture from "../test-fixtures/river-result.json";
import { LOCALE_KEY, resolveLocale, translations } from "./I18n";
import { fr } from "./messages";

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  vi.spyOn(api, "list").mockResolvedValue([]);
});

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

it("uses the browser language, with an explicit saved choice taking precedence", () => {
  expect(resolveLocale(null, "fr-CA")).toBe("fr");
  expect(resolveLocale("en", "fr-FR")).toBe("en");
  expect(resolveLocale("fr", "en-US")).toBe("fr");
  expect(resolveLocale("invalid", "fr-FR")).toBe("fr");
  expect(resolveLocale(null, "de-DE")).toBe("en");
  vi.spyOn(navigator, "language", "get").mockReturnValue("fr-FR");
  mount();
  expect(
    screen.getByRole("heading", { name: "Configuration du spot" }),
  ).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("fr");
});

it("keeps interpolation parameters intact throughout the translation catalogue", () => {
  const placeholders = (value: string) =>
    [...value.matchAll(/\{\w+\}/g)].map(([key]) => key).sort();
  for (const [english, french] of Object.entries(fr)) {
    expect(french.trim()).not.toBe("");
    expect(placeholders(french), english).toEqual(placeholders(english));
  }
});

it("formats French values and fractional bets without changing the engine's values", () => {
  const locale = translations("fr");
  expect(locale.number(1234.5)).toBe("1 234,50");
  expect(locale.number(null)).toBe("—");
  expect(locale.percent(25.1)).toBe("25,1 %");
  expect(
    locale.actionLabel({
      id: "bet_0.125",
      kind: "bet",
      label: "Bet 12.5%",
      amount: 1.25,
      fraction: 0.125,
    }),
  ).toBe("Mise 12,5 %");
  expect(
    locale.actionLabel({
      id: "bet_1",
      kind: "allin",
      label: "All-in",
      amount: 10,
      fraction: 1,
    }),
  ).toBe("Tapis");
  expect(
    locale.actionLabel({
      id: "fold",
      kind: "fold",
      label: "Fold",
      amount: 0,
      fraction: 0,
    }),
  ).toBe("Se coucher");
  expect(
    locale.actionLabel({
      id: "call",
      kind: "call",
      label: "Call",
      amount: 1,
      fraction: 0,
    }),
  ).toBe("Suivre");
  expect(translations("en").betSize(0.125)).toBe("12.5%");
});

it("translates range, network and structured API validation errors", () => {
  const locale = translations("fr");
  expect(locale.errorMessage(new Error("Invalid weight: AKs:2"))).toBe(
    "Poids invalide : AKs:2",
  );
  expect(locale.errorMessage(new Error("Failed to fetch"))).toMatch(
    /Connexion au serveur impossible/,
  );
  expect(
    locale.errorMessage(
      new ApiError("validation", [
        {
          loc: ["body", "pot"],
          type: "less_than_equal",
          msg: "Input should be less than or equal to 1000000",
          ctx: { le: 1000000 },
        },
      ]),
    ),
  ).toBe(
    "Taille du pot : La valeur doit être inférieure ou égale à 1 000 000.",
  );
  expect(
    locale.errorMessage(
      new ApiError("validation", [
        {
          loc: ["body"],
          type: "value_error",
          msg: "Value error, Ranges have no compatible deal after card removal",
        },
      ]),
    ),
  ).toBe(
    "Les ranges n’ont aucune distribution compatible après retrait des cartes.",
  );
});

it("switches language without losing edits and restores the choice on remount", async () => {
  const user = userEvent.setup();
  const app = mount();
  await user.clear(screen.getByLabelText("Pot size"));
  await user.type(screen.getByLabelText("Pot size"), "12.5");
  await user.click(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByLabelText("Taille du pot")).toHaveValue(12.5);
  expect(screen.getByRole("button", { name: "K de pique" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Français" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(localStorage.getItem(LOCALE_KEY)).toBe("fr");
  expect(document.title).toBe("Riverline — Solveur de river");
  await user.clear(screen.getByLabelText("Range OOP au format texte"));
  await user.type(screen.getByLabelText("Range OOP au format texte"), "AKs:2");
  expect(screen.getByRole("alert")).toHaveTextContent("Poids invalide : AKs:2");
  await user.click(screen.getByRole("button", { name: "English" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Invalid weight: AKs:2");
  expect(screen.getByLabelText("Pot size")).toHaveValue(12.5);
  await user.click(screen.getByRole("button", { name: "Français" }));
  app.unmount();
  mount();
  expect(
    screen.getByRole("heading", { name: "Configuration du spot" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Taille du pot")).toHaveValue(12.5);
});

it("runs the French workflow with unchanged API configuration and live-translates its result", async () => {
  localStorage.setItem(LOCALE_KEY, "fr");
  vi.spyOn(api, "create").mockResolvedValue({ id: "fr-run", status: "queued" });
  vi.spyOn(api, "job").mockResolvedValue({
    id: "fr-run",
    status: "completed",
    iteration: 2000,
    max_iterations: 2000,
    created_at: "2026-10-03T10:00:00Z",
    started_at: null,
    finished_at: null,
    algorithm: "cfr_plus",
    elapsed_seconds: 1,
    exploitability_pct: fixture.exploitability_pct,
    error: null,
    config: DEFAULT_CONFIG,
  } satisfies SolveJob);
  vi.spyOn(api, "results").mockResolvedValue(fixture as unknown as SolveResult);
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: "Lancer le calcul" }));
  await waitFor(() =>
    expect(api.create).toHaveBeenCalledWith(DEFAULT_CONFIG, expect.anything()),
  );
  expect(
    await screen.findByRole("heading", { name: "Calcul terminé" }),
  ).toBeInTheDocument();
  const inspect = await screen.findByRole("button", {
    name: "Voir la stratégie",
  });
  await waitFor(() => expect(inspect).toBeEnabled());
  await user.click(inspect);
  expect(
    screen.getByRole("heading", { name: "Stratégie" }),
  ).toBeInTheDocument();
  const matrix = screen.getByRole("group", { name: "Matrice de stratégie" });
  await user.click(within(matrix).getByRole("button", { name: "AA" }));
  await user.click(screen.getByRole("button", { name: "AhAd" }));
  expect(screen.getByText("Combos adverses compatibles")).toBeInTheDocument();
  expect(screen.getAllByRole("img")[0]).toHaveAccessibleName(
    /Parole: .*Mise 75/,
  );
  await user.selectOptions(
    screen.getByLabelText("Nœud de l’arbre de jeu"),
    "check",
  );
  expect(
    screen.getByRole("option", { name: "IP face à Parole" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "English" }));
  expect(screen.getByLabelText("Game tree node")).toHaveValue("check");
  expect(screen.getByRole("heading", { name: "Strategy" })).toBeInTheDocument();
  expect(api.create).toHaveBeenCalledTimes(1);
});
