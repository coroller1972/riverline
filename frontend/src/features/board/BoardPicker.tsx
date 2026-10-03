import { useI18n } from "../../i18n/I18n";
import { Panel } from "../../components/ui";
import { DECK, GLYPHS } from "./cards";

export function PlayingCard({
  card,
  small = false,
  river = false,
}: {
  card?: string;
  small?: boolean;
  river?: boolean;
}) {
  const { t, cardName } = useI18n();
  return (
    <span
      className={`playing-card ${small ? "small" : ""} ${river ? "river-card" : ""} suit-${card?.[1] ?? "s"}`}
      aria-label={card ? cardName(card) : t("Empty card")}
    >
      {card ? (
        <>
          <span>{card[0]}</span>
          <span>{GLYPHS[card[1]]}</span>
        </>
      ) : (
        <span className="empty-card">—</span>
      )}
    </span>
  );
}
export function BoardCards({
  board,
  small = false,
}: {
  board: string[];
  small?: boolean;
}) {
  return (
    <div className={`board-cards ${small ? "compact" : ""}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i}>
          {!small && (
            <span className="eyebrow">
              {i === 0
                ? "Flop"
                : i === 3
                  ? "Turn"
                  : i === 4
                    ? "River"
                    : "\u00a0"}
            </span>
          )}
          <PlayingCard card={board[i]} river={i === 4} small={small} />
        </div>
      ))}
    </div>
  );
}
export function BoardPicker({
  board,
  onChange,
}: {
  board: string[];
  onChange: (cards: string[]) => void;
}) {
  const { t, cardName } = useI18n();
  function toggle(card: string) {
    if (board.includes(card)) onChange(board.filter((c) => c !== card));
    else if (board.length < 5) onChange([...board, card]);
  }
  function random() {
    const deck = [...DECK];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    onChange(deck.slice(0, 5));
  }
  return (
    <Panel
      title={t("Board")}
      aside={
        <span className="caption">
          {t("Pick 5 cards · card removal applies to both ranges")}
        </span>
      }
    >
      <div className="board-row">
        <BoardCards board={board} />
        <div className="board-tools">
          <span className="mono muted">
            {t("{count} / 5 cards selected", { count: board.length })}
          </span>
          <div className="button-row">
            <button type="button" className="button small" onClick={random}>
              {t("Random")}
            </button>
            <button
              type="button"
              className="button small"
              onClick={() => onChange([])}
            >
              {t("Clear")}
            </button>
          </div>
        </div>
      </div>
      <div className="scroll-box">
        <div className="deck-grid" role="group" aria-label={t("Deck")}>
          {DECK.map((card) => (
            <button
              type="button"
              key={card}
              className={`deck-card suit-${card[1]} ${board.includes(card) ? "selected" : ""}`}
              aria-label={cardName(card)}
              aria-pressed={board.includes(card)}
              onClick={() => toggle(card)}
              disabled={board.length === 5 && !board.includes(card)}
            >
              {card[0]}
              {GLYPHS[card[1]]}
            </button>
          ))}
        </div>
      </div>
      {board.length < 5 && (
        <p className="caption">
          {t(
            board.length === 4
              ? "Select one more card to complete the river board."
              : "Select {count} more cards to complete the river board.",
            { count: 5 - board.length },
          )}
        </p>
      )}
    </Panel>
  );
}
