# Phase 1: Smart Contract Development

## Overview

This phase covers the implementation of the core smart contracts for the THOPE Staking Protocol:
- **Token.sol** – ERC-20 TestDope (THOPE) token
- **Staking.sol** – Staking contract with 10% fixed APR

---

## Project Setup

### Dependencies Installed

```bash
npm install --save-dev hardhat@^2.22.0 @nomicfoundation/hardhat-toolbox@^4.0.0 dotenv
npm install @openzeppelin/contracts@^5.0.0
```

### Project Structure

```
EVM-Staking-Assessment/
├── contracts/
│   ├── Token.sol           # ERC-20 THOPE token
│   └── Staking.sol         # Staking contract
├── scripts/
│   └── deploy.js           # Deployment script
├── test/                   # Test files (Phase 2)
├── hardhat.config.js       # Hardhat configuration
├── package.json
├── .env.example            # Environment template
└── .gitignore
```

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile contracts |
| `npm run test` | Run tests |
| `npm run coverage` | Run test coverage |
| `npm run deploy:local` | Deploy to local Hardhat |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run node` | Start local Hardhat node |

---

## Token Contract (Token.sol)

### Specification

| Property | Value |
|----------|-------|
| Name | TestDope |
| Symbol | THOPE |
| Decimals | 18 |
| Initial Supply | 1,000,000 THOPE |
| Standard | ERC-20 (OpenZeppelin) |

### Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestDope is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    constructor() ERC20("TestDope", "THOPE") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
```

---

## Staking Contract (Staking.sol)

### Features

| Feature | Description |
|---------|-------------|
| **APR** | 10% fixed annual rate |
| **Reward Model** | Synthetix-style cumulative reward-per-token |
| **Accrual** | Per-second, calculated on-chain |
| **Unstaking** | No lockup, no penalties |
| **Security** | ReentrancyGuard, SafeERC20 |

### Core Functions

| Function | Visibility | Description |
|----------|------------|-------------|
| `stake(uint256 amount)` | external | Deposit THOPE to earn rewards |
| `withdraw(uint256 amount)` | public | Withdraw + auto-claim rewards |
| `claimRewards()` | external | Claim rewards without unstaking |
| `exit()` | external | Full exit (withdraw all + claim) |
| `balanceOf(address)` | external view | Get user's staked balance |
| `earned(address)` | public view | Get user's pending rewards |
| `rewardPerToken()` | public view | Get cumulative reward index |
| `rewardPoolBalance()` | external view | Get available reward pool |

### Constants

```solidity
uint256 public constant APR_NUMERATOR = 10;           // 10% annual rate
uint256 public constant APR_DENOMINATOR = 100;        // percentage base
uint256 public constant SECONDS_PER_YEAR = 31_557_600; // 365.25 days
uint256 public constant PRECISION = 1e18;
```

### Reward Calculation

The reward rate is derived from 10% APR, applied per second:

```solidity
function rewardPerToken() public view returns (uint256) {
    if (totalStaked == 0) {
        return rewardPerTokenStored;
    }
    
    uint256 timeElapsed = block.timestamp - lastUpdateTime;
    
    return rewardPerTokenStored + 
        (timeElapsed * APR_NUMERATOR * PRECISION) / (SECONDS_PER_YEAR * APR_DENOMINATOR);
}

function earned(address account) public view returns (uint256) {
    uint256 currentRewardPerToken = rewardPerToken();
    uint256 rewardDelta = currentRewardPerToken - userRewardPerTokenPaid[account];
    
    return (_balances[account] * rewardDelta) / PRECISION + rewards[account];
}
```

### Mathematical Proof

**Example:** User stakes 1000 THOPE for 1 year

```
rewardPerToken after 1 year:
= 0 + (31,557,600 × 10 × 1e18) / (31,557,600 × 100)
= 1e17  (0.1 in 18-decimal format)

earned:
= (1000e18 × 1e17) / 1e18
= 100e18
= 100 THOPE ✅ (10% of 1000)
```

### Events

```solidity
event Staked(address indexed user, uint256 amount);
event Withdrawn(address indexed user, uint256 amount);
event RewardsClaimed(address indexed user, uint256 reward);
```

---

## Security Features

| Check | Implementation |
|-------|----------------|
| Reentrancy | `nonReentrant` modifier on all state-changing functions |
| Safe Transfers | `SafeERC20` library for all token operations |
| Zero Address | Constructor validates token address |
| Zero Amount | `stake()` and `withdraw()` require amount > 0 |
| Balance Check | `withdraw()` verifies user has sufficient balance |
| Division by Zero | `rewardPerToken()` handles `totalStaked == 0` |
| Overflow | Solidity 0.8+ built-in checks |
| CEI Pattern | State updated before external calls |

---

## Deployment Script

The deployment script (`scripts/deploy.js`) performs:

1. Deploy TestDope token
2. Deploy Staking contract with token address
3. Transfer 100,000 THOPE to staking contract for rewards
4. Log deployed addresses

### Local Deployment Output

```
Deploying contracts with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

1. Deploying TestDope (THOPE) token...
   TestDope deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

2. Deploying Staking contract...
   Staking deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

3. Funding staking contract with reward tokens...
   Transferred 100000.0 THOPE for rewards

========================================
DEPLOYMENT COMPLETE
========================================
```

---

## Files Created

| File | Purpose |
|------|---------|
| `contracts/Token.sol` | ERC-20 THOPE token |
| `contracts/Staking.sol` | Staking contract with 10% APR |
| `scripts/deploy.js` | Deployment automation |
| `hardhat.config.js` | Hardhat configuration |
| `.env.example` | Environment template |
| `.gitignore` | Git ignore rules |

---

## Issues Fixed During Review

| Issue | Severity | Resolution |
|-------|----------|------------|
| `exit()` reverts with zero balance | Low | Added balance check before withdraw |
| No reward pool visibility | Info | Added `rewardPoolBalance()` view function |
| `withdraw` was external | Medium | Changed to `public` for internal call from `exit()` |

---

## Next Steps

- **Phase 2:** Testing – Unit tests, integration tests, coverage
- **Phase 3:** Deployment – Sepolia testnet deployment
- **Phase 4:** Frontend – React/Next.js dashboard
- **Phase 5:** Documentation – Complete README
