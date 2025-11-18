# Perpulator - Perpetual Futures Position Calculator

A web-based tool for cryptocurrency traders to calculate position sizes, risk/reward ratios, and manage leverage on perpetual futures contracts.

## Features

- **Position Entry**: Calculate positions based on entry price, capital, and leverage (1x-50x)
- **Live Crypto Prices**: Real-time price data from CoinGecko API
- **Position Adjustment**: Add or reduce positions with updated metrics
- **Risk/Reward Analysis**: Automatically calculate risk/reward ratios
- **PNL Tracking**: Monitor current profit/loss based on live prices
- **Liquidation Price**: Calculate liquidation levels for leveraged positions
- **Multi-Input Support**: Enter position size in USD or coin quantities
- **Stop Loss Management**: Optional stop loss with risk calculations

## Supported Cryptocurrencies

Currently supports major cryptocurrencies including:
- Bitcoin (BTC)
- Ethereum (ETH)
- Binance Coin (BNB)
- Solana (SOL)
- Ripple (XRP)
- And 20+ others

## Tech Stack

- **Framework**: Next.js 14
- **UI**: React 18 with Tailwind CSS
- **State Management**: React Hooks
- **API**: CoinGecko API for live pricing
- **Language**: TypeScript
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to project directory
cd perpulator

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` to use the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── PositionForm.tsx   # Initial position entry
│   └── PositionAdjustment.tsx  # Position adjustment interface
├── lib/                   # Library code
│   └── cryptoApi.ts       # CoinGecko API integration
├── types/                 # TypeScript type definitions
│   └── position.ts        # Position-related types
└── utils/                 # Utility functions
    └── calculations.ts    # Position calculation logic
```

## Usage

### Step 1: Enter Your Position
1. Select cryptocurrency (BTC, ETH, etc.)
2. Choose direction (Long or Short)
3. Enter entry price
4. Enter position size (USD or coins)
5. Set leverage (1x-50x)
6. Optional: Set stop loss price
7. Click "Calculate Position"

### Step 2: Adjust Your Position
1. Choose action (Add or Reduce)
2. Enter new entry price for the adjustment
3. Enter adjustment size
4. View updated metrics:
   - New average entry price
   - Total position size
   - Risk/Reward ratio
   - Liquidation price
   - Current PNL

## Calculations Explained

### Average Entry Price
When adding to a position at a different price, the new average entry price is calculated as:
```
Average = (Original Size × Original Price + Adjustment Size × Adjustment Price) / Total Size
```

### Risk/Reward Ratio
Based on stop loss distance:
```
Risk = |Entry Price - Stop Loss| × Position Size
Reward = Risk × 2 (assuming 2:1 ratio)
Ratio = Reward / Risk
```

### Liquidation Price
For leveraged positions:
```
Long: Liquidation Price = Entry Price × (1 - 1/Leverage)
Short: Liquidation Price = Entry Price × (1 + 1/Leverage)
```

### PNL
```
PNL = (Current Price - Entry Price) / Entry Price × Position Size
PNL% = ((Current Price - Entry Price) / Entry Price) × 100
```

## API

### CoinGecko API
- Free tier (no authentication required)
- Real-time price data
- 24h/7d price changes
- Market cap and volume data

## Features Pipeline

Future enhancements:
- [ ] Save positions to local storage
- [ ] Position history and analytics
- [ ] Multiple position management
- [ ] Percent-based position sizing
- [ ] Options position calculator
- [ ] DCA (Dollar Cost Averaging) calculator
- [ ] Portfolio analytics
- [ ] Export position reports

## License

MIT

## Author

Created for crypto traders seeking accurate position sizing tools.

## Disclaimer

This tool is for educational and informational purposes only. It does not provide financial advice. Always do your own research and consult with a financial advisor before making trading decisions. Past performance is not indicative of future results.
