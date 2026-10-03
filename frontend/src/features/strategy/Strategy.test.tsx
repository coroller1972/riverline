import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import type { StrategyNode } from "../../api/types";
import fixture from "../../test-fixtures/river-result.json";
import { ComboInspector } from "./ComboInspector";
import { StrategyBar } from "./StrategyBar";
const root = fixture.nodes.find(
  (n) => n.id === "root",
) as unknown as StrategyNode;
it("renders actual frequencies with accessible action labels", () => {
  const frequencies = root.combos[0].strategy;
  render(<StrategyBar actions={root.actions} frequencies={frequencies} />);
  expect(screen.getByRole("img")).toHaveAccessibleName(/Check: .*Bet 75%:/);
});
it("shows exact-combo action EVs and blocker counts", async () => {
  const user = userEvent.setup();
  render(<ComboInspector node={root} hand="AA" />);
  await user.click(screen.getByRole("button", { name: "AhAd" }));
  expect(
    screen.getByRole("columnheader", { name: "EV bb" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Compatible opponent combos")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Per-card counts can overlap. The total counts each blocked combo once.",
    ),
  ).toBeInTheDocument();
});
