# Phase 3: Deployment & Verification

## Overview

Deployment of the THOPE Staking Protocol (with tiered rewards) to the Sepolia testnet with Etherscan verification.

---

## Deployed Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| TestDope (THOPE) | `0x396D0b6A5080e41b656cC89e1Bb09f61406017AC` | [Verified ✅](https://sepolia.etherscan.io/address/0x396D0b6A5080e41b656cC89e1Bb09f61406017AC#code) |
| Staking | `0x40036d5614C838583B69984d135e6837A92Ca255` | [Verified ✅](https://sepolia.etherscan.io/address/0x40036d5614C838583B69984d135e6837A92Ca255#code) |

---

## Deployment Summary

| Parameter | Value |
|-----------|-------|
| Network | Sepolia Testnet |
| Token Supply | 1,000,000 THOPE |
| Reward Pool | 100,000 THOPE |
| Deployer Balance | 900,000 THOPE |
| Reward Tiers | Bronze (5%), Silver (10%), Gold (15%) |

---

## Deployment Script Enhancements

The deployment script (`scripts/deploy.js`) includes:

1. **Token Deployment** – Deploys TestDope ERC-20 with 1M supply
2. **Staking Deployment** – Deploys Staking contract linked to token
3. **Reward Funding** – Transfers 100,000 THOPE to reward pool
4. **Verification Step** – Asserts reward pool is funded correctly via `rewardPoolBalance()`

```
4. Verifying reward pool funding...
   Staking contract token balance: 100000.0 THOPE
   Reward pool balance (via contract): 100000.0 THOPE
   ✅ Reward pool verified successfully!
```

---

## Etherscan Verification

Both contracts were verified using the Hardhat Etherscan plugin:

```bash
npx hardhat verify --network sepolia <TOKEN_ADDRESS>
npx hardhat verify --network sepolia <STAKING_ADDRESS> <TOKEN_ADDRESS>
```

### Configuration

```javascript
// hardhat.config.js
etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
}
```

---

## Environment Variables

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
DEPLOYER_PRIVATE_KEY=<private_key>
ETHERSCAN_API_KEY=<etherscan_key>
```

---

## Deployment Commands

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify Token
npx hardhat verify --network sepolia 0x396D0b6A5080e41b656cC89e1Bb09f61406017AC

# Verify Staking
npx hardhat verify --network sepolia 0x40036d5614C838583B69984d135e6837A92Ca255 0x396D0b6A5080e41b656cC89e1Bb09f61406017AC
```
