// Contract addresses deployed on Sepolia
export const CONTRACTS = {
    token: "0xA4D90aee9E74Abb933ACa624838f5a4F85BcB351",
    staking: "0xb61Bfe9F5CaaBFf4360997F1c6768D2620d2ae72",
};

// Token ABI (ERC20 + mint)
export const TOKEN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

// Staking ABI
export const STAKING_ABI = [
    // View functions
    "function stakingToken() view returns (address)",
    "function totalStaked() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function earned(address account) view returns (uint256)",
    "function rewardPoolBalance() view returns (uint256)",
    "function rewardPerToken() view returns (uint256)",
    "function APR_NUMERATOR() view returns (uint256)",
    "function APR_DENOMINATOR() view returns (uint256)",
    // State-changing functions
    "function stake(uint256 amount)",
    "function withdraw(uint256 amount)",
    "function claimRewards()",
    "function exit()",
    // Events
    "event Staked(address indexed user, uint256 amount)",
    "event Withdrawn(address indexed user, uint256 amount)",
    "event RewardsClaimed(address indexed user, uint256 reward)",
];
