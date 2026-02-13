# THOPE Staking Protocol – Task Breakdown & Specification

This document defines the complete implementation plan for the THOPE Staking Protocol, covering smart contracts, testing, deployment, frontend, and documentation.

---

## Phase 1: Smart Contract Development ✅

### 1. Token Contract (`Token.sol`)

Implement an ERC-20 token used for staking and reward distribution.

**Requirements**
- Name: `TestDope`
- Symbol: `THOPE`
- Decimals: `18`
- Initial Supply: `1,000,000 THOPE`
- Mint entire supply to deployer in constructor
- Use OpenZeppelin ERC20 implementation

---

### 2. Staking Contract (`Staking.sol`)

Implement a non-custodial staking contract with tiered rewards and per-user accounting.

#### Core Design
- Single staking asset: THOPE
- Single reward asset: THOPE
- **Tiered APR** based on staked amount:
  - Bronze (< 1,000 THOPE): **5% APR**
  - Silver (1,000 – 9,999 THOPE): **10% APR**
  - Gold (≥ 10,000 THOPE): **15% APR**
- Rewards accrue **per second**
- All logic fully on-chain
- No loops in reward calculation

#### Reward Accounting
- Uses **per-user time-based** accounting (not global accumulator)
- Each user's rewards are calculated as: `balance × tierAPR × timeElapsed / (secondsPerYear × 100)`
- Rewards are settled before any tier transitions

#### Required Functions
- `stake(uint256 amount)`
- `withdraw(uint256 amount)` → Returns **principal + accrued rewards**
- `claimRewards()`
- `exit()` → Full exit (withdraw all + claim)
- `earned(address user) view returns (uint256)`
- `balanceOf(address user) view returns (uint256)`
- `totalStaked() view returns (uint256)`
- `rewardPoolBalance() view returns (uint256)`
- `getUserTier(address user) view returns (string)`
- `getTierAPR(uint256 balance) pure returns (uint256)`

#### Security Constraints
- Inherit `ReentrancyGuard` from OpenZeppelin
- Use `SafeERC20` for all token transfers
- Follow checks-effects-interactions pattern

---

## Phase 2: Testing ✅

### Test Summary

| Component | Tests | Coverage |
|-----------|-------|----------|
| Token.test.js | 41 | 100% |
| Staking.test.js | 81 | 100% |
| **Total** | **122** | **100% line** |

### Test Categories
- Deployment, constants verification
- Tier classification (Bronze/Silver/Gold boundaries)
- Staking flows, tier transition events
- Reward calculations at each tier level
- Tier transitions (upgrade/downgrade with reward settlement)
- Withdrawing, claiming, exit function
- Multiple users in different tiers
- Security (reentrancy, access control, CEI pattern)
- Edge cases (1 wei, boundaries, long staking, rapid sequences)
- Gas optimization

---

## Phase 3: Deployment ✅

### Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| Token (THOPE) | `0x396D0b6A5080e41b656cC89e1Bb09f61406017AC` |
| Staking | `0x40036d5614C838583B69984d135e6837A92Ca255` |

- Both contracts verified on Etherscan ✅
- Reward pool funded with 100,000 THOPE ✅
- Deployment script includes reward pool verification ✅

---

## Phase 4: Frontend Development ✅

### Tech Stack
- Next.js 16, Wagmi v2, Viem, RainbowKit, Tailwind CSS

### Features Implemented
- Wallet connection (MetaMask via RainbowKit)
- **Tier badge** with dynamic APR display (🥉 Bronze · 5% APR)
- **Tier progression hint** (e.g., "Stake 500 more for Silver")
- **Tier info banner** showing all three tiers
- Balance display (wallet, staked, earned)
- Approve → Stake flow
- Withdraw, Claim Rewards, Exit All
- Real-time reward refresh (5s interval)
- Pool stats (total staked, reward pool)

---

## Phase 5: Documentation & Cleanup ✅

### Documentation Created
- `README.md` – Project overview, tiers, setup, structure
- `documentations/Phase1.md` – Smart contract development
- `documentations/Phase2.md` – Testing & coverage
- `documentations/Phase3.md` – Deployment & verification
- `documentations/Phase4.md` – Frontend development
- `documentations/Architecture.md` – Technical design
- `documentations/TESTING_GUIDE.md` – Frontend testing steps

### Final Checks
- All tests pass (122 tests) ✅
- Frontend works against deployed contracts ✅
- Contracts verified on Etherscan ✅
- Code committed and pushed ✅

---

## Completion Criteria

The task is considered complete when:
- ✅ Contracts compile and deploy successfully
- ✅ Tiered reward math is correct and loop-free
- ✅ Tests cover core, tier transitions, and edge cases
- ✅ Frontend supports full staking lifecycle with tier display
- ✅ Documentation is clear and reproducible