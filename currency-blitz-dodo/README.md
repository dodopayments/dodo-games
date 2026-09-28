# Currency Blitz Dodo

Timed FX conversion race — convert currencies against the clock, stack speed bonuses, and ride combo multipliers.

Part of [Dodo Games](https://games.dodopayments.com) · slug `currency-blitz-dodo`.

## How to Play

- Read the prompt (`100 USD → INR`) and enter the converted amount
- Beat the per-question timer (15s / 12s / 10s by difficulty)
- You have **3 lives** — wrong answers or timeouts cost a life
- **Double Points** auto-triggers when you answer within 3 seconds
- **Freeze** adds +5s (start with 1; earn more on streaks)
- Every **5 correct** answers doubles your combo multiplier (caps at ×8)

## Modes

| Mode | Details |
|------|---------|
| **Blitz Run** | Pick Easy / Medium / Hard |
| **Daily Challenge** | Fixed Medium seed for the calendar day |

## Running Locally

Open `index.html` in a browser (serve from repo root so `../assets` resolves):

```bash
# from repo root
npx serve . -l 4173
# then visit http://localhost:4173/currency-blitz-dodo/
```

## Notes

- Uses **arcade mid-rates** (fixed educational rates), not live FX feeds
- High score / streak / avg speed / daily best persist in `localStorage`
- Game-feel via shared `DodoJuice`; analytics via `DodoAnalytics`
