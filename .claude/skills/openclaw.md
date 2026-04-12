---
description: Analyze a perpetual futures position using the Perpulator API. Calculates liquidation price, risk/reward, PnL, and more.
---

You are running the **OpenClaw** skill — a perpetual futures position analyzer powered by the Perpulator API.

## Step 1 — Get the API key

Check for the environment variable `PERPULATOR_API_KEY` using the Bash tool:
```bash
echo $PERPULATOR_API_KEY
```

If it is empty or unset, tell the user:
> "No API key found. Set it with: `export PERPULATOR_API_KEY=perp_...`
> You can generate one at https://perpulator.vercel.app (sign in → API Keys)"

Stop here if no key is available.

## Step 2 — Parse position parameters

Extract the following from the user's message (all required unless marked optional):

| Parameter | Description | Example |
|-----------|-------------|---------|
| `symbol` | Asset ticker | `BTC`, `ETH`, `SOL` |
| `side` | Direction | `long` or `short` |
| `entryPrice` | Entry price in USD | `71000` |
| `positionSize` | Margin in USD (not notional) | `1000` |
| `leverage` | Multiplier | `10` |
| `stopLoss` | Stop loss price *(optional)* | `65000` |
| `takeProfit` | Take profit price *(optional)* | `80000` |
| `currentPrice` | Current market price for live PnL *(optional)* | `71500` |

If any required parameter is missing, ask the user for it before proceeding.

## Step 3 — Call the Perpulator API

Use the Bash tool to POST to the calculate endpoint:

```bash
curl -s -X POST https://perpulator.vercel.app/api/v1/calculate \
  -H "Authorization: Bearer $PERPULATOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "<SYMBOL>",
    "side": "<SIDE>",
    "entryPrice": <ENTRY_PRICE>,
    "positionSize": <POSITION_SIZE>,
    "leverage": <LEVERAGE>,
    "stopLoss": <STOP_LOSS_OR_OMIT>,
    "takeProfit": <TAKE_PROFIT_OR_OMIT>,
    "currentPrice": <CURRENT_PRICE_OR_OMIT>
  }'
```

Omit optional fields that were not provided.

## Step 4 — Format the result

Present the response as a clean analysis. Use this format:

---

**⚡ OpenClaw Analysis — {SYMBOL} {SIDE.toUpperCase()}**

| Field | Value |
|-------|-------|
| Entry Price | ${entryPrice} |
| Position Size (margin) | ${positionSize} |
| Leverage | {leverage}x |
| Notional Size | ${notionalSize} |
| Liquidation Price | ${liquidationPrice} ⚠️ |
| Stop Loss | ${stopLoss} (if set) |
| Take Profit | ${takeProfit} (if set) |
| Risk Amount | ${riskAmount} (if set) |
| Reward Amount | ${rewardAmount} (if set) |
| Risk/Reward Ratio | {riskRewardRatio}:1 (if set) |
| Current PnL | ${pnl} ({pnlPercentage}%) (if currentPrice set) |

Then add a one-sentence risk note, e.g.:
> "At {leverage}x leverage, a {pct}% move against your position triggers liquidation."
> (Calculate pct as `(|entryPrice - liquidationPrice| / entryPrice) * 100`, rounded to 2 decimal places)

---

If the API returns an error, show the error message clearly and suggest how to fix it (e.g., "stopLoss must be below entryPrice for a LONG").

## Examples of valid invocations

```
/openclaw BTC long entry 71000 size 1000 leverage 10 SL 65000 TP 82000
/openclaw ETH short 3200 500 5x stop 3400 target 2800 current 3180
/openclaw SOL long 145 200 20x
```
