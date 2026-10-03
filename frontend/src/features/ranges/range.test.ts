import { expect, it } from "vitest";
import { HANDS, blocked, classCombos } from "../board/cards";
import { parseRange, setClassWeight } from "./range";
it("enumerates the standard 169 cells and all 1326 combos", () => {
  expect(HANDS).toHaveLength(169);
  expect(HANDS[1]).toBe("AKs");
  expect(HANDS[13]).toBe("AKo");
  expect(HANDS.flatMap(classCombos)).toHaveLength(1326);
  expect(classCombos("AA")).toHaveLength(6);
  expect(classCombos("AKs")).toHaveLength(4);
  expect(classCombos("AKo")).toHaveLength(12);
});
it("preserves exact combo weights, canonical ordering, and card removal", () => {
  const range = parseRange("AKs:0.75,KhAh:0.5,AsKs:0");
  expect(range.size).toBe(3);
  expect(range.get("AhKh")).toBe(0.5);
  expect([...range.keys()].filter((c) => !blocked(c, ["Ah"]))).toHaveLength(2);
});
it("applies a class brush without losing other exact combos", () => {
  const text = setClassWeight("AhAd:0.5,AKs", "AKs", 0.25);
  expect(parseRange(text).get("AhAd")).toBe(0.5);
  expect(parseRange(text).get("AhKh")).toBe(0.25);
  expect(parseRange(setClassWeight(text, "AKs", 0)).size).toBe(1);
});
it("rejects unsupported notation and invalid weights", () => {
  for (const value of [
    "JJ+",
    "AA-22",
    "AsAs",
    "AA:-1",
    "AA:2",
    "AA:nan",
    "AA:",
  ])
    expect(() => parseRange(value)).toThrow();
});
