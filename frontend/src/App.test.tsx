import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { api } from "./api/client";
import type { SolveJob, SolveResult } from "./api/types";
import { DEFAULT_CONFIG } from "./features/solver-config/defaults";
import fixture from "./test-fixtures/river-result.json";

beforeEach(() => {
  localStorage.clear();
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
it("edits the board, enforces five unique cards, and toggles ranges", async () => {
  const user = userEvent.setup();
  mount();
  expect(
    screen.getByRole("heading", { name: "Spot setup" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "A of spades" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "K of spades" }));
  expect(screen.getByRole("button", { name: "Run solve" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "A of spades" }));
  expect(screen.getByRole("button", { name: "Run solve" })).toBeEnabled();
  const matrix = screen.getByRole("group", { name: "OOP range matrix" });
  expect(within(matrix).getAllByRole("button")).toHaveLength(169);
  await user.click(within(matrix).getByRole("button", { name: "JJ" }));
  expect(
    (screen.getByLabelText("OOP range string") as HTMLTextAreaElement).value,
  ).toContain("JJ");
  await user.click(screen.getByRole("button", { name: "IP In position" }));
  expect(screen.getByLabelText("IP range string")).toHaveValue(
    DEFAULT_CONFIG.ip_range,
  );
});
it("submits configuration and inspects a completed real-engine fixture", async () => {
  const user = userEvent.setup();
  vi.spyOn(api, "create").mockResolvedValue({
    id: "test-run",
    status: "queued",
  });
  vi.spyOn(api, "job").mockResolvedValue({
    id: "test-run",
    status: "completed",
    iteration: 2000,
    max_iterations: 2000,
    created_at: new Date().toISOString(),
    started_at: null,
    finished_at: null,
    algorithm: "cfr_plus",
    elapsed_seconds: 1,
    exploitability_pct: fixture.exploitability_pct,
    error: null,
    config: DEFAULT_CONFIG,
  } satisfies SolveJob);
  vi.spyOn(api, "results").mockResolvedValue(fixture as unknown as SolveResult);
  mount();
  await user.click(screen.getByRole("button", { name: "Run solve" }));
  await waitFor(() =>
    expect(api.create).toHaveBeenCalledWith(DEFAULT_CONFIG, expect.anything()),
  );
  expect(
    await screen.findByRole("heading", { name: "Solve complete" }),
  ).toBeInTheDocument();
  const inspect = await screen.findByRole("button", {
    name: /Inspect strategy/,
  });
  await waitFor(() => expect(inspect).toBeEnabled());
  await user.click(inspect);
  expect(screen.getByRole("heading", { name: "Strategy" })).toBeInTheDocument();
  expect(
    screen.getByRole("group", { name: "Strategy matrix" }),
  ).toBeInTheDocument();
  await user.click(
    within(screen.getByRole("group", { name: "Strategy matrix" })).getByRole(
      "button",
      { name: "AA" },
    ),
  );
  expect(screen.getByRole("button", { name: "AhAd" })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Game tree node"), "check");
  expect(screen.getByLabelText("Game tree node")).toHaveValue("check");
});
it("shows API validation errors without fake results", async () => {
  const user = userEvent.setup();
  vi.spyOn(api, "create").mockRejectedValue(
    new Error("Ranges have no compatible deal"),
  );
  mount();
  await user.click(screen.getByRole("button", { name: "Run solve" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Ranges have no compatible deal",
  );
  expect(screen.getByRole("button", { name: "3 Strategy" })).toBeDisabled();
});
