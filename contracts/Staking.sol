// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title THOPE Staking Contract
 * @notice Stake THOPE tokens and earn tiered APR rewards
 * @dev Uses per-user time-based accounting with tiered reward rates
 *
 * Tier Structure:
 *   Bronze (< 1,000 THOPE):  5% APR
 *   Silver (1,000 - 9,999):  10% APR
 *   Gold   (>= 10,000):     15% APR
 */
contract Staking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant SECONDS_PER_YEAR = 31_557_600; // 365.25 days
    uint256 public constant APR_DENOMINATOR = 100; // percentage base

    // Tier APR rates
    uint256 public constant BRONZE_APR = 5; // 5% APR
    uint256 public constant SILVER_APR = 10; // 10% APR
    uint256 public constant GOLD_APR = 15; // 15% APR

    // Tier thresholds (in token units with 18 decimals)
    uint256 public constant SILVER_THRESHOLD = 1_000 * 1e18; // 1,000 THOPE
    uint256 public constant GOLD_THRESHOLD = 10_000 * 1e18; // 10,000 THOPE

    // ============ State Variables ============

    IERC20 public immutable stakingToken;

    uint256 public totalStaked;

    mapping(address => uint256) private _balances;
    mapping(address => uint256) public userLastUpdateTime;
    mapping(address => uint256) public rewards;

    // ============ Events ============

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event TierChanged(address indexed user, uint256 newAPR);

    // ============ Constructor ============

    constructor(address _stakingToken) {
        require(_stakingToken != address(0), "Invalid token address");
        stakingToken = IERC20(_stakingToken);
    }

    // ============ Modifiers ============

    modifier updateReward(address account) {
        if (account != address(0)) {
            rewards[account] = earned(account);
            userLastUpdateTime[account] = block.timestamp;
        }
        _;
    }

    // ============ View Functions ============

    /**
     * @notice Get the APR for a given staked balance
     * @param balance The staked balance to check
     * @return APR numerator (5, 10, or 15)
     */
    function getTierAPR(uint256 balance) public pure returns (uint256) {
        if (balance >= GOLD_THRESHOLD) return GOLD_APR;
        if (balance >= SILVER_THRESHOLD) return SILVER_APR;
        return BRONZE_APR;
    }

    /**
     * @notice Get the tier name for a user's staked balance
     * @param account The user address
     * @return Tier name as string ("Bronze", "Silver", or "Gold")
     */
    function getUserTier(
        address account
    ) external view returns (string memory) {
        uint256 balance = _balances[account];
        if (balance >= GOLD_THRESHOLD) return "Gold";
        if (balance >= SILVER_THRESHOLD) return "Silver";
        return "Bronze";
    }

    /**
     * @notice Calculate pending rewards for an account
     * @param account The user address
     * @return Pending reward amount in THOPE
     */
    function earned(address account) public view returns (uint256) {
        uint256 balance = _balances[account];
        if (balance == 0) return rewards[account];

        uint256 timeElapsed = block.timestamp - userLastUpdateTime[account];
        uint256 apr = getTierAPR(balance);

        return
            (balance * apr * timeElapsed) /
            (SECONDS_PER_YEAR * APR_DENOMINATOR) +
            rewards[account];
    }

    /**
     * @notice Get staked balance for an account
     * @param account The user address
     * @return Staked amount in THOPE (18 decimals)
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    // ============ External Functions ============

    /**
     * @notice Stake THOPE tokens to earn tiered rewards
     * @param amount Amount of THOPE to stake (18 decimals)
     */
    function stake(
        uint256 amount
    ) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");

        uint256 oldBalance = _balances[msg.sender];
        uint256 oldAPR = getTierAPR(oldBalance);

        totalStaked += amount;
        _balances[msg.sender] += amount;

        uint256 newAPR = getTierAPR(_balances[msg.sender]);

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);

        if (newAPR != oldAPR) {
            emit TierChanged(msg.sender, newAPR);
        }
    }

    /**
     * @notice Withdraw staked tokens and claim rewards
     * @param amount Amount of THOPE to withdraw
     */
    function withdraw(uint256 amount) public nonReentrant {
        _withdrawInternal(amount);
    }

    /**
     * @notice Claim accrued rewards without unstaking
     */
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to claim");

        rewards[msg.sender] = 0;
        stakingToken.safeTransfer(msg.sender, reward);

        emit RewardsClaimed(msg.sender, reward);
    }

    /**
     * @notice Exit staking position completely (withdraw all + claim rewards)
     */
    function exit() external nonReentrant {
        uint256 balance = _balances[msg.sender];
        if (balance > 0) {
            _withdrawInternal(balance);
        }
    }

    /**
     * @dev Internal withdrawal logic - called by withdraw() and exit()
     */
    function _withdrawInternal(
        uint256 amount
    ) internal updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance");

        uint256 oldAPR = getTierAPR(_balances[msg.sender]);

        totalStaked -= amount;
        _balances[msg.sender] -= amount;

        uint256 newAPR = getTierAPR(_balances[msg.sender]);

        // Claim rewards automatically
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, reward);
            emit RewardsClaimed(msg.sender, reward);
        }

        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);

        if (newAPR != oldAPR) {
            emit TierChanged(msg.sender, newAPR);
        }
    }

    /**
     * @notice Get the contract's reward pool balance
     * @return Available rewards in the contract (excluding staked tokens)
     */
    function rewardPoolBalance() external view returns (uint256) {
        return stakingToken.balanceOf(address(this)) - totalStaked;
    }
}
