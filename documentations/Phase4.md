# Phase 4: Frontend Development

## Overview

Next.js frontend for the THOPE Staking Protocol with wallet connection, staking UI, and real-time reward tracking.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| Wagmi v2 | React hooks for Ethereum |
| Viem | TypeScript Ethereum library |
| RainbowKit | Wallet connection modal |
| Tailwind CSS | Styling |
| React Query | Server state management |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.js         # Root layout with Providers
│   │   ├── page.js           # Main staking page
│   │   ├── providers.js      # Wagmi/RainbowKit/ReactQuery
│   │   └── globals.css       # Dark theme styles
│   ├── components/
│   │   └── StakingCard.js    # Core staking UI component
│   └── config/
│       ├── contracts.js      # Contract addresses & ABIs
│       └── wagmi.js          # Wagmi chain configuration
├── package.json
└── next.config.mjs
```

---

## Features

| Feature | Description |
|---------|-------------|
| Wallet Connection | MetaMask via RainbowKit modal |
| Balance Display | Wallet balance, staked balance, earned rewards |
| Stake | Approve → Stake flow with amount input |
| Withdraw | Withdraw staked tokens + auto-claim rewards |
| Claim Rewards | Claim earned rewards without unstaking |
| Exit All | Withdraw everything + claim in one transaction |
| Real-time Rewards | Auto-refresh earned rewards every 5 seconds |
| Pool Stats | Total staked and reward pool balance |

---

## Key Implementation Details

### Transaction Handling

Used `useSendTransaction` + `encodeFunctionData` instead of `useWriteContract` to explicitly control gas limits. This was necessary because Viem's gas estimation returned values exceeding MetaMask's cap.

```javascript
const handleStake = () => {
    const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "stake",
        args: [amount],
    });
    sendStakeTx({
        to: CONTRACTS.staking,
        data,
        gas: 200000n,
    });
};
```

### Approval Flow

The approval and staking are separate steps:
1. User enters amount
2. If allowance < amount → shows "Approve THOPE" button
3. After approval succeeds → amount persists, shows "Stake THOPE" button
4. After staking succeeds → input clears, balances refresh

### Contract ABIs

JSON ABIs extracted from Hardhat compilation artifacts (`artifacts/contracts/`), not human-readable format. This ensures compatibility with Wagmi v2/Viem.

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and connect MetaMask on Sepolia.

---

## Issues Resolved

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `@metamask/sdk` missing | Wagmi v3 installed instead of v2 | Installed `wagmi@^2.9.0` + `@metamask/sdk` |
| Gas limit too high (21M > 16.7M cap) | Viem gas estimation exceeded MetaMask cap | Switched to `useSendTransaction` with explicit gas |
| Amount cleared after approval | Single useEffect cleared inputs on any tx success | Separated approval and staking effects |
| WalletConnect 403 errors | Placeholder project ID (`demo`) | Uses env var `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` |
