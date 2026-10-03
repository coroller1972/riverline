import {
  DECK,
  HANDS,
  RANKS,
  SUITS,
  classCombos,
  handClass,
} from "../board/cards";

export function parseRange(text: string): Map<string, number> {
  const output = new Map<string, number>();
  for (const token of text
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean)) {
    const [name, raw, extra] = token.split(":");
    const weight = raw === undefined ? 1 : Number(raw);
    if (
      extra !== undefined ||
      raw === "" ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      weight > 1
    )
      throw new Error(`Invalid weight: ${token}`);
    let combos: string[];
    if (HANDS.includes(name)) combos = classCombos(name);
    else if (
      name.length === 4 &&
      DECK.includes(name.slice(0, 2)) &&
      DECK.includes(name.slice(2)) &&
      name.slice(0, 2) !== name.slice(2)
    ) {
      const a = name.slice(0, 2),
        b = name.slice(2);
      combos = [
        RANKS.indexOf(a[0]) < RANKS.indexOf(b[0]) ||
        (a[0] === b[0] &&
          SUITS.indexOf(a[1] as (typeof SUITS)[number]) <
            SUITS.indexOf(b[1] as (typeof SUITS)[number]))
          ? a + b
          : b + a,
      ];
    } else
      throw new Error(
        `Unsupported range token: ${name}. Use AA, AKs, AKo or AhKh.`,
      );
    for (const c of combos) {
      if (weight > 0) output.set(c, weight);
      else output.delete(c);
    }
  }
  return output;
}
export function setClassWeight(text: string, name: string, weight: number) {
  const entries = parseRange(text);
  for (const combo of entries.keys())
    if (handClass(combo) === name) entries.delete(combo);
  for (const combo of classCombos(name))
    if (weight > 0) entries.set(combo, weight);
  // Compress uniform classes; retain exact combos where weights differ.
  const tokens: string[] = [];
  for (const cls of HANDS) {
    const all = classCombos(cls),
      present = all.filter((c) => entries.has(c));
    if (
      present.length === all.length &&
      present.every((c) => entries.get(c) === entries.get(present[0]))
    ) {
      const w = entries.get(present[0])!;
      tokens.push(w === 1 ? cls : `${cls}:${w}`);
    } else
      for (const c of present) {
        const w = entries.get(c)!;
        tokens.push(w === 1 ? c : `${c}:${w}`);
      }
  }
  return tokens.join(",");
}
