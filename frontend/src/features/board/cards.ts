export const RANKS = [..."AKQJT98765432"];
export const SUITS = ["s", "h", "d", "c"] as const;
export const GLYPHS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};
export const SUIT_NAMES: Record<string, string> = {
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs",
};
export const DECK = SUITS.flatMap((s) => RANKS.map((r) => r + s));
export const HANDS = RANKS.flatMap((r, i) =>
  RANKS.map((c, j) => (i === j ? r + c : i < j ? r + c + "s" : c + r + "o")),
);
export function handClass(combo: string) {
  const [a, s, b, t] = combo;
  const ranks = RANKS.indexOf(a) <= RANKS.indexOf(b) ? a + b : b + a;
  return a === b ? ranks : ranks + (s === t ? "s" : "o");
}
const comboCache = new Map<string, string[]>();
export function classCombos(name: string): string[] {
  const cached = comboCache.get(name);
  if (cached) return cached;
  const output: string[] = [];
  for (let i = 0; i < DECK.length; i++)
    for (let j = i + 1; j < DECK.length; j++) {
      const a = DECK[i],
        b = DECK[j];
      const c = RANKS.indexOf(a[0]) <= RANKS.indexOf(b[0]) ? a + b : b + a;
      if (handClass(c) === name) output.push(c);
    }
  comboCache.set(name, output);
  return output;
}
export const blocked = (combo: string, board: string[]) =>
  board.includes(combo.slice(0, 2)) || board.includes(combo.slice(2));
