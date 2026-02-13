# THOPE Staking Protocol

A non-custodial ERC-20 staking protocol with **tiered APR rewards**, deployed on Sepolia testnet with a Next.js frontend.

---

## 🏗️ Architecture

| Component | Technology |
|-----------|-----------|
| Token | ERC-20 (OpenZeppelin) |
| Staking | Per-user time-based accounting with tiered APR |
| Frontend | Next.js + Wagmi + RainbowKit |
| Network | Sepolia Testnet |

### Reward Tiers

| Tier | Staked Amount | APR |
|------|--------------|-----|
| 🥉 Bronze | < 1,000 THOPE | 5% |
| 🥈 Silver | 1,000 – 9,999 THOPE | 10% |
| 🥇 Gold | ≥ 10,000 THOPE | 15% |

### How It Works

1. Users **stake THOPE** tokens into the staking contract
2. Rewards accrue **per second** based on the user's tier APR
3. Staking more tokens can upgrade your tier for higher rewards
4. Users can **claim**, **withdraw**, or **exit** at any time — no lockup

---

## 📜 Deployed Contracts (Sepolia)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| Token (THOPE) | `0x396D0b6A5080e41b656cC89e1Bb09f61406017AC` | [View ↗](https://sepolia.etherscan.io/address/0x396D0b6A5080e41b656cC89e1Bb09f61406017AC#code) |
| Staking | `0x40036d5614C838583B69984d135e6837A92Ca255` | [View ↗](https://sepolia.etherscan.io/address/0x40036d5614C838583B69984d135e6837A92Ca255#code) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- MetaMask browser extension
- Sepolia ETH (for gas) — [Get from faucet](https://sepoliafaucet.com)

### 1. Clone & Install

```bash
git clone https://github.com/ayushns01/EVM-Staking-Assessment.git
cd EVM-Staking-Assessment
npm install
```

### 2. Run Smart Contract Tests

```bash
npm run test          # 122 tests
npm run coverage      # Coverage report
```

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 → Connect MetaMask (Sepolia) → Stake THOPE

---

## 📂 Project Structure

```
EVM-Staking-Assessment/
├── contracts/
│   ├── Token.sol              # ERC-20 THOPE token
│   └── Staking.sol            # Tiered staking (5/10/15% APR)
├── test/
│   ├── Token.test.js          # 41 token tests
│   └── Staking.test.js        # 81 staking tests
├── scripts/
│   └── deploy.js              # Deployment + reward funding
├── frontend/
│   └── src/
│       ├── app/               # Next.js pages & layout
│       ├── components/        # StakingCard UI with tier display
│       └── config/            # Contract ABIs & Wagmi config
├── documentations/            # Phase-by-phase documentation
└── hardhat.config.js
```

---

## 🔐 Smart Contracts

### Token.sol (TestDope / THOPE)

- Standard ERC-20 with 1,000,000 supply
- 18 decimals, minted to deployer

### Staking.sol

| Feature | Detail |
|---------|--------|
| Reward Model | Per-user time-based accounting |
| Tiers | Bronze (5%), Silver (10%), Gold (15%) |
| Accrual | Per-second, on-chain |
| Lockup | None |
| Security | ReentrancyGuard, SafeERC20, CEI pattern |

**Functions:**
- `stake(amount)` → Deposit THOPE to earn rewards
- `withdraw(amount)` → Withdraw + auto-claim rewards
- `claimRewards()` → Claim rewards without unstaking
- `exit()` → Withdraw all + claim all
- `earned(address)` → View pending rewards
- `balanceOf(address)` → View staked balance
- `getUserTier(address)` → Get current tier name
- `getTierAPR(balance)` → Get APR for a balance amount

---

## 🧪 Testing

**122 tests** with comprehensive coverage:

```
File          |  % Stmts | % Branch |  % Funcs |  % Lines |
--------------|----------|----------|----------|----------|
Staking.sol   |      100 |    71.88 |      100 |      100 |
Token.sol     |      100 |      100 |      100 |      100 |
```

Test categories include: deployment, tier classification, tier transitions, reward calculations per tier, withdrawals, claims, exit, multiple users, security, edge cases, and gas optimization.

```bash
npm run test       # Run all tests
npm run coverage   # Generate coverage report
```

---

## 🖥️ Frontend

Built with Next.js, Wagmi v2, and RainbowKit.

**Features:**
- Wallet connection via MetaMask
- Dynamic tier badge with APR (Bronze/Silver/Gold)
- Tier progression hint (e.g., "Stake 500 more for Silver")
- Real-time balance and reward display
- Stake / Withdraw / Claim / Exit actions
- Auto-refresh rewards every 5 seconds

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Phase 1](documentations/Phase1.md) | Smart contract development |
| [Phase 2](documentations/Phase2.md) | Testing & coverage |
| [Phase 3](documentations/Phase3.md) | Deployment & verification |
| [Phase 4](documentations/Phase4.md) | Frontend development |
| [Architecture](documentations/Architecture.md) | Technical design |
| [Task Breakdown](documentations/TASK_BREAKDOWN.md) | Full specification |
| [Testing Guide](documentations/TESTING_GUIDE.md) | Frontend testing steps |

---

## 🔧 Environment Variables

Create a `.env` file (see `.env.example`):

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
DEPLOYER_PRIVATE_KEY=<private_key>
ETHERSCAN_API_KEY=<etherscan_key>
```

For the frontend, optionally create `frontend/.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<walletconnect_project_id>
```

---

## 📋 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile contracts |
| `npm run test` | Run all tests |
| `npm run coverage` | Coverage report |
| `npm run deploy:local` | Deploy to local Hardhat |
| `npm run deploy:sepolia` | Deploy to Sepolia |
| `npm run node` | Start Hardhat node |

---

## License

MIT
