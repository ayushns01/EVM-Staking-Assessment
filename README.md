# THOPE Staking Protocol

A decentralized staking application that allows users to stake **TestDope (THOPE)** tokens and earn a **fixed 10% APR**, calculated fully on-chain with per-second precision.

---

## 1. Objective

The objective of this project is to build a decentralized application (dApp) that enables users to:

- Stake **TestDope (THOPE)** ERC-20 tokens
- Earn staking rewards dynamically (by the second)
- Unstake at any time with **principal + rewards returned**
- Interact through a simple and functional frontend interface

All staking and reward logic is implemented **entirely on-chain**, without relying on off-chain schedulers or cron jobs.

---

## 2. Tech Stack

### Smart Contracts
- **Language:** Solidity ^0.8.x
- **Framework:** Hardhat / Foundry
- **Libraries:** OpenZeppelin (ERC20, ReentrancyGuard, SafeERC20)

### Frontend
- **Framework:** React / Next.js
- **Web3 Client:** Wagmi + Viem (or Ethers.js v6)
- **Wallet Support:** MetaMask / Rabby

### Network
- **Testnet:** Sepolia
- **Local Development:** Hardhat Node / Anvil

---

## Deployed Contracts (Sepolia)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| **TestDope (THOPE)** | `0xA4D90aee9E74Abb933ACa624838f5a4F85BcB351` | [View](https://sepolia.etherscan.io/address/0xA4D90aee9E74Abb933ACa624838f5a4F85BcB351) |
| **Staking** | `0xb61Bfe9F5CaaBFf4360997F1c6768D2620d2ae72` | [View](https://sepolia.etherscan.io/address/0xb61Bfe9F5CaaBFf4360997F1c6768D2620d2ae72) |

**Reward Pool:** 100,000 THOPE ✅

---

## 3. Smart Contracts

### 3.1 Token.sol – TestDope (THOPE)

- ERC-20 token implemented using OpenZeppelin
- **Name:** TestDope
- **Symbol:** THOPE
- **Decimals:** 18
- **Initial Supply:** 1,000,000 THOPE
- Minted once to the deployer address
- Used as:
  - Staking asset
  - Reward distribution token

---

### 3.2 Staking.sol – Staking Contract

#### Core Features
- Users can stake THOPE tokens
- Rewards accrue at a **fixed 10% APR**
- Rewards are calculated **by the second**
- Users can unstake at any time
- **Principal + accrued rewards** are returned on exit
- No lockup periods or penalties

#### Technical Constraints (As Required)
- ❌ No `for` loops used in reward calculation
- ✅ Uses cumulative **reward-per-token** accounting
- ✅ Inherits `ReentrancyGuard` from OpenZeppelin
- ✅ Fully on-chain reward logic

#### Reward Model
- Rewards accrue continuously per second
- Per-second accrual is mathematically equivalent to daily APR-based rewards
- Reward calculation uses a global cumulative index to ensure:
  - O(1) gas complexity per user
  - No iteration over users
  - Accurate reward distribution across arbitrary staking times

---

## 4. Frontend Features

### Wallet Connection
- Connect wallet using MetaMask or Rabby

### Dashboard
Displays:
- User wallet balance (THOPE)
- User staked balance
- **Real-time earned rewards** (read directly from the contract or mocked)

### User Actions
- **Approve:** Allow the staking contract to spend THOPE
- **Stake:** Deposit THOPE tokens
- **Withdraw / Claim:** Exit staking position (principal + rewards)

The frontend correctly handles token approval flow and updates UI state after transactions are confirmed.

---

## 5. Setup & Installation

### Prerequisites
- Node.js >= 18
- npm or yarn
- MetaMask or Rabby wallet

---

### 5.1 Install Dependencies

```bash
npm install