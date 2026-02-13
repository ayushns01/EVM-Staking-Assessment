# THOPE Staking Protocol – Architecture & Technical Design
**Version:** Staking V1  
**Author:** Ayush Narayan Sharma  
**Stack:** Solidity (Foundry/Hardhat), React / Next.js, Wagmi + Viem  
**Network:** EVM-compatible testnets (Sepolia / Mumbai)

---

## 1. System Overview

The THOPE Staking Protocol is a **single-asset, single-reward, non-custodial staking system**.  
Users stake the ERC-20 token **TestDope (THOPE)** and earn rewards at a **fixed APR** calculated fully on-chain using a **cumulative reward index**.

> Although rewards accrue continuously per second, this model is mathematically
> equivalent to daily APR-based reward distribution and avoids time-based loops
> or off-chain schedulers.

### Design Goals
- Deterministic, transparent on-chain reward logic
- O(1) gas per interaction (no loops over users)
- Immediate unstaking with zero penalties
- Audit-friendly state accounting

---

## 2. Core Components

### A. TestDope Token (THOPE)

- **Standard:** ERC-20 (OpenZeppelin)
- **Decimals:** 18
- **Initial Supply:** 1,000,000 THOPE
- **Minting:** One-time mint to deployer
- **Usage:**
  - Staking asset
  - Reward asset (pre-funded to staking contract)

---

### B. Staking Contract

#### Staking Model
- Pool-based staking
- Single staking asset (THOPE)
- Single reward asset (THOPE)
- Rewards accrue continuously over time

#### Reward Strategy
- **Cumulative Reward-Per-Token Index (Synthetix-style)**
- Rewards scale linearly with time and stake amount
- No per-user loops or daily checkpoints

---

## 3. Storage Layout

```solidity
uint256 public totalStaked;

uint256 public rewardRate;              // tokens per second (scaled)
uint256 public rewardPerTokenStored;    // cumulative index
uint256 public lastUpdateTime;           // timestamp of last global update

mapping(address => uint256) balances;
mapping(address => uint256) userRewardPerTokenPaid;
mapping(address => uint256) rewards;