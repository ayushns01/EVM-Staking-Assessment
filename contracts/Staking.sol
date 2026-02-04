// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title THOPE Staking Contract
 * @notice Stake THOPE tokens and earn 10% fixed APR
 * @dev Uses Synthetix-style cumulative reward-per-token accounting
 * @dev Fixed-point math uses single PRECISION scaling to avoid double-scaling
 */
contract Staking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    // Reward rate derived from 10% APR, applied per second
    uint256 public constant APR_NUMERATOR = 10; // 10% annual rate
    uint256 public constant APR_DENOMINATOR = 100; // percentage base
    uint256 public constant SECONDS_PER_YEAR = 31_557_600; // 365.25 days
    uint256 public constant PRECISION = 1e18;

    // ============ State Variables ============

    IERC20 public immutable stakingToken;

    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;

    mapping(address => uint256) private _balances;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    // ============ Events ============

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);

    // ============ Constructor ============

    constructor(address _stakingToken) {
        require(_stakingToken != address(0), "Invalid token address");
        stakingToken = IERC20(_stakingToken);
        lastUpdateTime = block.timestamp;
    }

    // ============ Modifiers ============

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ============ View Functions ============

    /**
     * @notice Calculate cumulative reward per token staked
     * @dev Reward rate derived from 10% APR, applied per second
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }

        uint256 timeElapsed = block.timestamp - lastUpdateTime;

        // Reward rate derived from 10% APR, applied per second
        return
            rewardPerTokenStored +
            (timeElapsed * APR_NUMERATOR * PRECISION) /
            (SECONDS_PER_YEAR * APR_DENOMINATOR);
    }

    /**
     * @notice Calculate pending rewards for an account
     * @param account The user address
     * @return Pending reward amount in THOPE
     */
    function earned(address account) public view returns (uint256) {
        uint256 currentRewardPerToken = rewardPerToken();
        uint256 rewardDelta = currentRewardPerToken -
            userRewardPerTokenPaid[account];

        return
            (_balances[account] * rewardDelta) / PRECISION + rewards[account];
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
     * @notice Stake THOPE tokens to earn rewards
     * @param amount Amount of THOPE to stake (18 decimals)
     */
    function stake(
        uint256 amount
    ) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");

        totalStaked += amount;
        _balances[msg.sender] += amount;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
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
     * @dev Canonical exit function as per task: "Withdraw / Claim: Exit position"
     */
    function exit() external nonReentrant {
        uint256 balance = _balances[msg.sender];
        if (balance > 0) {
            // Call internal logic directly to avoid double nonReentrant
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

        totalStaked -= amount;
        _balances[msg.sender] -= amount;

        // Claim rewards automatically
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, reward);
            emit RewardsClaimed(msg.sender, reward);
        }

        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Get the contract's reward pool balance
     * @return Available rewards in the contract (excluding staked tokens)
     */
    function rewardPoolBalance() external view returns (uint256) {
        return stakingToken.balanceOf(address(this)) - totalStaked;
    }
}
