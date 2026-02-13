# Frontend Testing Guide

## Prerequisites

1. **MetaMask Extension** installed in your browser
2. **Sepolia ETH** in your wallet (get from [Alchemy Faucet](https://sepoliafaucet.com))
3. **THOPE Tokens** - you'll need some to stake

---

## Step 1: Get THOPE Tokens

Since you deployed the contracts, your deployer wallet has THOPE tokens.

**Option A: Use Deployer Wallet**
- Import your deployer private key into MetaMask
- You should have 900,000 THOPE (1M supply - 100K in reward pool)

**Option B: Transfer Tokens via Etherscan**
1. Go to [Token Contract on Etherscan](https://sepolia.etherscan.io/address/0xA4D90aee9E74Abb933ACa624838f5a4F85BcB351#writeContract)
2. Click "Connect to Web3" → Connect your deployer wallet
3. Use `transfer` function to send THOPE to your test wallet

---

## Step 2: Start the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Step 3: Connect Wallet

1. Click **"Connect Wallet"** button
2. Select **MetaMask** from the modal
3. Approve the connection in MetaMask
4. **Switch to Sepolia network** if prompted

---

## Step 4: Test Staking Flow

### 4.1 Check Balances
After connecting, you should see:
- **Wallet Balance**: Your THOPE balance
- **Staked Balance**: 0.0000 THOPE (initially)
- **Earned Rewards**: 0.0000 THOPE (initially)

### 4.2 Stake Tokens
1. Enter an amount (e.g., `100`)
2. Click **"Approve THOPE"** (first time only)
3. Confirm the approval in MetaMask
4. After approval, click **"Stake THOPE"**
5. Confirm the stake transaction in MetaMask

### 4.3 Watch Rewards Accrue
- Rewards update every 5 seconds on the UI
- Wait 1-2 minutes to see rewards accumulate
- 10% APR = ~0.0000031 THOPE per 100 THOPE per second

### 4.4 Claim Rewards
1. Click **"Claim Rewards"** button
2. Confirm in MetaMask
3. Rewards are added to your wallet balance

### 4.5 Withdraw
1. Switch to **Withdraw** tab
2. Enter amount or click **MAX**
3. Click **"Withdraw"**
4. Confirm in MetaMask
5. Tokens + any pending rewards return to wallet

### 4.6 Exit All
1. Click **"Exit All"** button
2. Confirm in MetaMask
3. All staked tokens + all rewards return at once

---

## Verification Checklist

| Test | Expected Result |
|------|-----------------|
| Connect MetaMask | Shows wallet address, balances display |
| Approve THOPE | MetaMask shows approval tx |
| Stake 100 THOPE | Wallet balance ↓, Staked balance ↑ |
| Wait 1 minute | Earned rewards > 0 |
| Claim Rewards | Wallet balance ↑, Earned resets to 0 |
| Withdraw 50 THOPE | Staked ↓ 50, Wallet ↑ 50 + rewards |
| Exit All | Staked → 0, Wallet gets all back |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wallet not connecting | Ensure MetaMask is on Sepolia network |
| 0 balance shown | Check you have THOPE in your wallet |
| Transaction fails | Ensure you have Sepolia ETH for gas |
| Approval button shows again | Need to approve enough for stake amount |
| WalletConnect errors in console | Ignore - MetaMask works without it |

---

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| Token (THOPE) | `0xA4D90aee9E74Abb933ACa624838f5a4F85BcB351` |
| Staking | `0xb61Bfe9F5CaaBFf4360997F1c6768D2620d2ae72` |
