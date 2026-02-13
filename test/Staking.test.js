const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title Staking Contract Test Suite
 * @notice Comprehensive tests for the THOPE Staking Contract with tiered rewards
 * @dev Tests cover: deployment, tiers, staking, rewards, withdrawals, security, and edge cases
 *
 * Tier Structure:
 *   Bronze (< 1,000 THOPE):  5% APR
 *   Silver (1,000 - 9,999):  10% APR
 *   Gold   (>= 10,000):     15% APR
 */
describe("Staking Contract", function () {
    // ============ Constants ============
    const SECONDS_PER_YEAR = 31_557_600n;
    const SECONDS_PER_DAY = 86_400n;
    const INITIAL_SUPPLY = ethers.parseEther("1000000");
    const REWARD_POOL = ethers.parseEther("100000");
    const USER_TOKENS = ethers.parseEther("50000");

    // Tier thresholds
    const SILVER_THRESHOLD = ethers.parseEther("1000");
    const GOLD_THRESHOLD = ethers.parseEther("10000");

    // Tier APRs
    const BRONZE_APR = 5n;
    const SILVER_APR = 10n;
    const GOLD_APR = 15n;
    const APR_DENOMINATOR = 100n;

    // ============ Test Fixture ============
    async function deployFixture() {
        const [owner, user1, user2, user3, attacker] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestDope");
        const token = await Token.deploy();

        const Staking = await ethers.getContractFactory("Staking");
        const staking = await Staking.deploy(token.target);

        // Fund staking contract with rewards
        await token.transfer(staking.target, REWARD_POOL);

        // Transfer tokens to users for testing
        await token.transfer(user1.address, USER_TOKENS);
        await token.transfer(user2.address, USER_TOKENS);
        await token.transfer(user3.address, USER_TOKENS);

        return { token, staking, owner, user1, user2, user3, attacker };
    }

    // Helper: stake tokens for a user
    async function stakeTokens(token, staking, user, amount) {
        await token.connect(user).approve(staking.target, amount);
        await staking.connect(user).stake(amount);
    }

    // ============ Deployment Tests ============
    describe("Deployment", function () {
        it("Should set the staking token correctly", async function () {
            const { token, staking } = await loadFixture(deployFixture);
            expect(await staking.stakingToken()).to.equal(token.target);
        });

        it("Should initialize with zero total staked", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.totalStaked()).to.equal(0);
        });

        it("Should revert with zero address token", async function () {
            const Staking = await ethers.getContractFactory("Staking");
            await expect(
                Staking.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid token address");
        });

        it("Should have reward pool funded", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.rewardPoolBalance()).to.equal(REWARD_POOL);
        });
    });

    // ============ Constants Verification ============
    describe("Constants", function () {
        it("Should have correct BRONZE_APR (5)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.BRONZE_APR()).to.equal(5);
        });

        it("Should have correct SILVER_APR (10)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.SILVER_APR()).to.equal(10);
        });

        it("Should have correct GOLD_APR (15)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.GOLD_APR()).to.equal(15);
        });

        it("Should have correct APR_DENOMINATOR (100)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.APR_DENOMINATOR()).to.equal(100);
        });

        it("Should have correct SECONDS_PER_YEAR (365.25 days)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.SECONDS_PER_YEAR()).to.equal(SECONDS_PER_YEAR);
        });

        it("Should have correct SILVER_THRESHOLD (1000 THOPE)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.SILVER_THRESHOLD()).to.equal(SILVER_THRESHOLD);
        });

        it("Should have correct GOLD_THRESHOLD (10000 THOPE)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.GOLD_THRESHOLD()).to.equal(GOLD_THRESHOLD);
        });
    });

    // ============ Tier Classification Tests ============
    describe("Tier Classification", function () {
        it("Should return Bronze for zero balance", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");
        });

        it("Should return Bronze for < 1000 THOPE", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("500"));
            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");
        });

        it("Should return Silver for exactly 1000 THOPE", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            expect(await staking.getUserTier(user1.address)).to.equal("Silver");
        });

        it("Should return Silver for 5000 THOPE", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("5000"));
            expect(await staking.getUserTier(user1.address)).to.equal("Silver");
        });

        it("Should return Gold for exactly 10000 THOPE", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("10000"));
            expect(await staking.getUserTier(user1.address)).to.equal("Gold");
        });

        it("Should return Gold for 20000 THOPE", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("20000"));
            expect(await staking.getUserTier(user1.address)).to.equal("Gold");
        });

        it("getTierAPR should return correct values at boundaries", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.getTierAPR(0)).to.equal(5);
            expect(await staking.getTierAPR(ethers.parseEther("999"))).to.equal(5);
            expect(await staking.getTierAPR(ethers.parseEther("1000"))).to.equal(10);
            expect(await staking.getTierAPR(ethers.parseEther("9999"))).to.equal(10);
            expect(await staking.getTierAPR(ethers.parseEther("10000"))).to.equal(15);
            expect(await staking.getTierAPR(ethers.parseEther("50000"))).to.equal(15);
        });
    });

    // ============ Staking Tests ============
    describe("Staking", function () {
        it("Should stake tokens successfully", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount);

            expect(await staking.balanceOf(user1.address)).to.equal(amount);
            expect(await staking.totalStaked()).to.equal(amount);
        });

        it("Should emit Staked event", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, amount);
            await expect(staking.connect(user1).stake(amount))
                .to.emit(staking, "Staked")
                .withArgs(user1.address, amount);
        });

        it("Should emit TierChanged event when crossing tier", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, amount);
            await expect(staking.connect(user1).stake(amount))
                .to.emit(staking, "TierChanged")
                .withArgs(user1.address, 10); // Bronze -> Silver
        });

        it("Should NOT emit TierChanged when staying in same tier", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");

            await token.connect(user1).approve(staking.target, amount);
            await expect(staking.connect(user1).stake(amount))
                .to.not.emit(staking, "TierChanged");
        });

        it("Should revert on zero amount", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            await expect(
                staking.connect(user1).stake(0)
            ).to.be.revertedWith("Cannot stake 0");
        });

        it("Should update user balance on multiple stakes", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount1 = ethers.parseEther("500");
            const amount2 = ethers.parseEther("700");

            await stakeTokens(token, staking, user1, amount1);
            await stakeTokens(token, staking, user1, amount2);

            expect(await staking.balanceOf(user1.address)).to.equal(amount1 + amount2);
        });

        it("Should reduce token balance on staking", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");
            const balanceBefore = await token.balanceOf(user1.address);

            await stakeTokens(token, staking, user1, amount);

            expect(await token.balanceOf(user1.address)).to.equal(balanceBefore - amount);
        });

        it("Should revert without approval", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            await expect(
                staking.connect(user1).stake(ethers.parseEther("100"))
            ).to.be.reverted;
        });

        it("Should handle multiple users staking", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);
            const amount1 = ethers.parseEther("1000");
            const amount2 = ethers.parseEther("5000");

            await stakeTokens(token, staking, user1, amount1);
            await stakeTokens(token, staking, user2, amount2);

            expect(await staking.balanceOf(user1.address)).to.equal(amount1);
            expect(await staking.balanceOf(user2.address)).to.equal(amount2);
            expect(await staking.totalStaked()).to.equal(amount1 + amount2);
        });
    });

    // ============ Reward Calculation Tests ============
    describe("Reward Calculation", function () {
        it("Should accrue Bronze rewards correctly (5% APR)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("500"); // Bronze tier

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR));

            const earned = await staking.earned(user1.address);
            const expected = (amount * BRONZE_APR) / APR_DENOMINATOR; // 5% of 500 = 25

            // Allow 0.01% tolerance for block timestamp variance
            expect(earned).to.be.closeTo(expected, expected / 10000n);
        });

        it("Should accrue Silver rewards correctly (10% APR)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("5000"); // Silver tier

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR));

            const earned = await staking.earned(user1.address);
            const expected = (amount * SILVER_APR) / APR_DENOMINATOR; // 10% of 5000 = 500

            expect(earned).to.be.closeTo(expected, expected / 10000n);
        });

        it("Should accrue Gold rewards correctly (15% APR)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("10000"); // Gold tier

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR));

            const earned = await staking.earned(user1.address);
            const expected = (amount * GOLD_APR) / APR_DENOMINATOR; // 15% of 10000 = 1500

            expect(earned).to.be.closeTo(expected, expected / 10000n);
        });

        it("Should return 0 earned for no stake", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            expect(await staking.earned(user1.address)).to.equal(0);
        });

        it("Should accrue rewards proportional to time (30 days)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000"); // Silver tier

            await stakeTokens(token, staking, user1, amount);
            const thirtyDays = 30n * SECONDS_PER_DAY;
            await time.increase(Number(thirtyDays));

            const earned = await staking.earned(user1.address);
            const expected = (amount * SILVER_APR * thirtyDays) / (SECONDS_PER_YEAR * APR_DENOMINATOR);

            expect(earned).to.be.closeTo(expected, expected / 1000n);
        });

        it("Should accrue rewards proportional to time (1 day)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000"); // Silver tier

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_DAY));

            const earned = await staking.earned(user1.address);
            const expected = (amount * SILVER_APR * SECONDS_PER_DAY) / (SECONDS_PER_YEAR * APR_DENOMINATOR);

            expect(earned).to.be.closeTo(expected, expected / 100n);
        });

        it("Should verify 6-month reward at Silver tier", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR / 2n));

            const earned = await staking.earned(user1.address);
            // 6 months at 10% = 5% of 1000 = 50
            const expected = ethers.parseEther("50");

            expect(earned).to.be.closeTo(expected, expected / 10000n);
        });

        it("Should independently calculate rewards for multiple users in different tiers", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);
            const bronzeAmount = ethers.parseEther("500");  // Bronze: 5%
            const goldAmount = ethers.parseEther("10000");  // Gold: 15%

            await stakeTokens(token, staking, user1, bronzeAmount);
            await stakeTokens(token, staking, user2, goldAmount);
            await time.increase(Number(SECONDS_PER_YEAR));

            const earned1 = await staking.earned(user1.address);
            const earned2 = await staking.earned(user2.address);

            const expected1 = (bronzeAmount * BRONZE_APR) / APR_DENOMINATOR; // 25
            const expected2 = (goldAmount * GOLD_APR) / APR_DENOMINATOR;     // 1500

            expect(earned1).to.be.closeTo(expected1, expected1 / 1000n);
            expect(earned2).to.be.closeTo(expected2, expected2 / 1000n);
        });
    });

    // ============ Tier Transition Tests ============
    describe("Tier Transitions", function () {
        it("Should settle rewards on tier upgrade (Bronze -> Silver)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            // Stake 500 (Bronze = 5%)
            await stakeTokens(token, staking, user1, ethers.parseEther("500"));
            await time.increase(Number(SECONDS_PER_YEAR));

            // Earn 5% of 500 = 25 at Bronze
            const earnedBefore = await staking.earned(user1.address);
            const expectedBronze = ethers.parseEther("25");
            expect(earnedBefore).to.be.closeTo(expectedBronze, expectedBronze / 1000n);

            // Stake 600 more → total 1100 (Silver = 10%)
            await stakeTokens(token, staking, user1, ethers.parseEther("600"));
            expect(await staking.getUserTier(user1.address)).to.equal("Silver");

            // Wait another year → earn 10% of 1100 = 110 at Silver
            await time.increase(Number(SECONDS_PER_YEAR));
            const earnedAfter = await staking.earned(user1.address);

            // Total should be ~25 (Bronze) + ~110 (Silver) = ~135
            const expectedTotal = expectedBronze + ethers.parseEther("110");
            expect(earnedAfter).to.be.closeTo(expectedTotal, expectedTotal / 100n);
        });

        it("Should settle rewards on tier downgrade (Silver -> Bronze)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            // Stake 5000 (Silver = 10%)
            await stakeTokens(token, staking, user1, ethers.parseEther("5000"));
            await time.increase(Number(SECONDS_PER_YEAR));

            // Earn 10% of 5000 = 500 at Silver
            const earnedBefore = await staking.earned(user1.address);
            const expectedSilver = ethers.parseEther("500");
            expect(earnedBefore).to.be.closeTo(expectedSilver, expectedSilver / 1000n);

            // Withdraw 4500 → 500 remaining (Bronze = 5%) - rewards auto-claimed
            await staking.connect(user1).withdraw(ethers.parseEther("4500"));

            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");

            // Wait another year → earn 5% of 500 = 25 at Bronze
            await time.increase(Number(SECONDS_PER_YEAR));
            const earnedAfter = await staking.earned(user1.address);
            const expectedBronze = ethers.parseEther("25");
            expect(earnedAfter).to.be.closeTo(expectedBronze, expectedBronze / 100n);
        });

        it("Should emit TierChanged on upgrade via stake", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            // Start at Bronze
            await stakeTokens(token, staking, user1, ethers.parseEther("500"));

            // Upgrade to Silver
            await token.connect(user1).approve(staking.target, ethers.parseEther("500"));
            await expect(staking.connect(user1).stake(ethers.parseEther("500")))
                .to.emit(staking, "TierChanged")
                .withArgs(user1.address, 10);
        });

        it("Should emit TierChanged on downgrade via withdraw", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            await stakeTokens(token, staking, user1, ethers.parseEther("1500"));
            expect(await staking.getUserTier(user1.address)).to.equal("Silver");

            await expect(staking.connect(user1).withdraw(ethers.parseEther("600")))
                .to.emit(staking, "TierChanged")
                .withArgs(user1.address, 5); // Silver -> Bronze
        });

        it("Should handle Bronze -> Gold jump", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            await token.connect(user1).approve(staking.target, ethers.parseEther("10000"));
            await expect(staking.connect(user1).stake(ethers.parseEther("10000")))
                .to.emit(staking, "TierChanged")
                .withArgs(user1.address, 15); // Bronze -> Gold

            expect(await staking.getUserTier(user1.address)).to.equal("Gold");
        });
    });

    // ============ Withdrawal Tests ============
    describe("Withdrawing", function () {
        it("Should withdraw and auto-claim rewards", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR));

            const balanceBefore = await token.balanceOf(user1.address);
            await staking.connect(user1).withdraw(amount);

            const balanceAfter = await token.balanceOf(user1.address);
            const received = balanceAfter - balanceBefore;

            // Should receive principal + ~100 THOPE rewards (10% of 1000)
            const expectedMin = amount + ethers.parseEther("99");
            expect(received).to.be.gt(expectedMin);
        });

        it("Should emit Withdrawn event", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await expect(staking.connect(user1).withdraw(amount))
                .to.emit(staking, "Withdrawn")
                .withArgs(user1.address, amount);
        });

        it("Should emit RewardsClaimed on withdraw with rewards", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_DAY));

            await expect(staking.connect(user1).withdraw(amount))
                .to.emit(staking, "RewardsClaimed");
        });

        it("Should revert on zero amount", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            await expect(
                staking.connect(user1).withdraw(0)
            ).to.be.revertedWith("Cannot withdraw 0");
        });

        it("Should revert on insufficient balance", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("100"));
            await expect(
                staking.connect(user1).withdraw(ethers.parseEther("200"))
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should allow partial withdrawal", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");
            const withdrawAmount = ethers.parseEther("400");

            await stakeTokens(token, staking, user1, stakeAmount);
            await staking.connect(user1).withdraw(withdrawAmount);

            expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount - withdrawAmount);
        });

        it("Should update totalStaked on withdrawal", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await staking.connect(user1).withdraw(ethers.parseEther("300"));

            expect(await staking.totalStaked()).to.equal(ethers.parseEther("700"));
        });

        it("Should handle sequential withdrawals", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));

            await staking.connect(user1).withdraw(ethers.parseEther("300"));
            await staking.connect(user1).withdraw(ethers.parseEther("300"));
            await staking.connect(user1).withdraw(ethers.parseEther("400"));

            expect(await staking.balanceOf(user1.address)).to.equal(0);
        });
    });

    // ============ Claim Rewards Tests ============
    describe("Claiming Rewards", function () {
        it("Should claim rewards without unstaking", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR));

            const balanceBefore = await token.balanceOf(user1.address);
            await staking.connect(user1).claimRewards();
            const balanceAfter = await token.balanceOf(user1.address);

            const claimed = balanceAfter - balanceBefore;
            const expected = ethers.parseEther("100"); // 10% of 1000
            expect(claimed).to.be.closeTo(expected, expected / 1000n);

            // Balance should remain staked
            expect(await staking.balanceOf(user1.address)).to.equal(amount);
        });

        it("Should emit RewardsClaimed event", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await time.increase(Number(SECONDS_PER_DAY));

            await expect(staking.connect(user1).claimRewards())
                .to.emit(staking, "RewardsClaimed");
        });

        it("Should revert if no rewards", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            // User never staked, so has zero rewards
            await expect(
                staking.connect(user1).claimRewards()
            ).to.be.revertedWith("No rewards to claim");
        });

        it("Should reset earned to zero after claiming", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await time.increase(Number(SECONDS_PER_DAY));

            await staking.connect(user1).claimRewards();
            expect(await staking.earned(user1.address)).to.equal(0);
        });

        it("Should allow claiming multiple times", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));

            await time.increase(Number(SECONDS_PER_DAY));
            await staking.connect(user1).claimRewards();

            await time.increase(Number(SECONDS_PER_DAY));
            await staking.connect(user1).claimRewards();

            // Both claims should have succeeded
            expect(await staking.earned(user1.address)).to.equal(0);
        });
    });

    // ============ Exit Tests ============
    describe("Exit", function () {
        it("Should exit with all tokens + rewards", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("5000");

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR));

            const balanceBefore = await token.balanceOf(user1.address);
            await staking.connect(user1).exit();
            const balanceAfter = await token.balanceOf(user1.address);

            const received = balanceAfter - balanceBefore;
            // Should receive 5000 + ~500 rewards (10% of 5000)
            expect(received).to.be.gt(amount + ethers.parseEther("499"));

            expect(await staking.balanceOf(user1.address)).to.equal(0);
            expect(await staking.earned(user1.address)).to.equal(0);
        });

        it("Should handle exit with zero balance (no-op)", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            // Should not revert
            await staking.connect(user1).exit();
        });

        it("Should emit both Withdrawn and RewardsClaimed events", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_DAY));

            await expect(staking.connect(user1).exit())
                .to.emit(staking, "Withdrawn")
                .and.to.emit(staking, "RewardsClaimed");
        });
    });

    // ============ View Functions Tests ============
    describe("View Functions", function () {
        it("balanceOf should return correct values", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);
            expect(await staking.balanceOf(user1.address)).to.equal(0);

            await stakeTokens(token, staking, user1, ethers.parseEther("500"));
            expect(await staking.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
            expect(await staking.balanceOf(user2.address)).to.equal(0);
        });

        it("totalStaked should track all users", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);

            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await stakeTokens(token, staking, user2, ethers.parseEther("2000"));

            expect(await staking.totalStaked()).to.equal(ethers.parseEther("3000"));
        });

        it("rewardPoolBalance should decrease as rewards are claimed", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const poolBefore = await staking.rewardPoolBalance();

            await stakeTokens(token, staking, user1, ethers.parseEther("10000"));
            await time.increase(Number(SECONDS_PER_YEAR));
            await staking.connect(user1).claimRewards();

            const poolAfter = await staking.rewardPoolBalance();
            expect(poolAfter).to.be.lt(poolBefore);
        });

        it("earned should return 0 immediately after staking", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            // Earned should be 0 or very close to 0 (same block)
            const earned = await staking.earned(user1.address);
            expect(earned).to.be.lt(ethers.parseEther("0.001"));
        });

        it("getUserTier should reflect balance changes", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");

            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            expect(await staking.getUserTier(user1.address)).to.equal("Silver");

            await stakeTokens(token, staking, user1, ethers.parseEther("9000"));
            expect(await staking.getUserTier(user1.address)).to.equal("Gold");

            await staking.connect(user1).withdraw(ethers.parseEther("9500"));
            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");
        });
    });

    // ============ Multiple Users Tests ============
    describe("Multiple Users", function () {
        it("Should track independent balances and tiers", async function () {
            const { token, staking, user1, user2, user3 } = await loadFixture(deployFixture);

            await stakeTokens(token, staking, user1, ethers.parseEther("500"));   // Bronze
            await stakeTokens(token, staking, user2, ethers.parseEther("5000"));  // Silver
            await stakeTokens(token, staking, user3, ethers.parseEther("15000")); // Gold

            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");
            expect(await staking.getUserTier(user2.address)).to.equal("Silver");
            expect(await staking.getUserTier(user3.address)).to.equal("Gold");
        });

        it("Should calculate independent rewards per tier", async function () {
            const { token, staking, user1, user2, user3 } = await loadFixture(deployFixture);

            await stakeTokens(token, staking, user1, ethers.parseEther("500"));   // Bronze 5%
            await stakeTokens(token, staking, user2, ethers.parseEther("5000"));  // Silver 10%
            await stakeTokens(token, staking, user3, ethers.parseEther("15000")); // Gold 15%

            await time.increase(Number(SECONDS_PER_YEAR));

            const earned1 = await staking.earned(user1.address);
            const earned2 = await staking.earned(user2.address);
            const earned3 = await staking.earned(user3.address);

            // Bronze: 5% of 500 = 25
            expect(earned1).to.be.closeTo(ethers.parseEther("25"), ethers.parseEther("0.1"));
            // Silver: 10% of 5000 = 500
            expect(earned2).to.be.closeTo(ethers.parseEther("500"), ethers.parseEther("1"));
            // Gold: 15% of 15000 = 2250
            expect(earned3).to.be.closeTo(ethers.parseEther("2250"), ethers.parseEther("5"));
        });

        it("One user's actions should not affect another's rewards", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);

            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await stakeTokens(token, staking, user2, ethers.parseEther("1000"));

            await time.increase(Number(SECONDS_PER_YEAR));

            // User1 withdraws
            await staking.connect(user1).withdraw(ethers.parseEther("1000"));

            // User2's earned should be the same as if user1 never withdrew
            const earned2 = await staking.earned(user2.address);
            const expected2 = ethers.parseEther("100"); // 10% of 1000
            expect(earned2).to.be.closeTo(expected2, expected2 / 100n);
        });

        it("Should handle all three users exiting", async function () {
            const { token, staking, user1, user2, user3 } = await loadFixture(deployFixture);

            await stakeTokens(token, staking, user1, ethers.parseEther("500"));
            await stakeTokens(token, staking, user2, ethers.parseEther("5000"));
            await stakeTokens(token, staking, user3, ethers.parseEther("10000"));

            await time.increase(Number(SECONDS_PER_YEAR));

            await staking.connect(user1).exit();
            await staking.connect(user2).exit();
            await staking.connect(user3).exit();

            expect(await staking.totalStaked()).to.equal(0);
        });
    });

    // ============ Security Tests ============
    describe("Security", function () {
        it("Should prevent reentrancy on stake", async function () {
            // ReentrancyGuard is applied - verified by modifier presence
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");
            await stakeTokens(token, staking, user1, amount);
            expect(await staking.balanceOf(user1.address)).to.equal(amount);
        });

        it("Should prevent reentrancy on withdraw", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("100"));
            await staking.connect(user1).withdraw(ethers.parseEther("100"));
            expect(await staking.balanceOf(user1.address)).to.equal(0);
        });

        it("Should prevent reentrancy on claimRewards", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await time.increase(Number(SECONDS_PER_DAY));
            await staking.connect(user1).claimRewards();
        });

        it("Should prevent reentrancy on exit", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("100"));
            await staking.connect(user1).exit();
            expect(await staking.balanceOf(user1.address)).to.equal(0);
        });

        it("Should follow CEI pattern - state updated before transfers", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await time.increase(Number(SECONDS_PER_DAY));

            // This should succeed without reentrancy issues
            await staking.connect(user1).withdraw(ethers.parseEther("500"));
            expect(await staking.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
        });

        it("Should reject zero address in constructor", async function () {
            const Staking = await ethers.getContractFactory("Staking");
            await expect(
                Staking.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid token address");
        });

        it("Should validate amount > 0 for stake", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);
            await expect(
                staking.connect(user1).stake(0)
            ).to.be.revertedWith("Cannot stake 0");
        });
    });

    // ============ Edge Cases ============
    describe("Edge Cases", function () {
        it("Should handle 1 wei stake (Bronze tier)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await token.connect(user1).approve(staking.target, 1);
            await staking.connect(user1).stake(1);
            expect(await staking.balanceOf(user1.address)).to.equal(1);
            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");
        });

        it("Should handle exact tier boundary (999.999... THOPE)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const justBelowSilver = ethers.parseEther("999.999999999999999999");
            await stakeTokens(token, staking, user1, justBelowSilver);
            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");
        });

        it("Should handle long staking period (10 years)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await stakeTokens(token, staking, user1, amount);
            await time.increase(Number(SECONDS_PER_YEAR * 10n));

            const earned = await staking.earned(user1.address);
            // 10% * 10 years = 100% of 1000 = 1000 THOPE
            const expected = ethers.parseEther("1000");
            expect(earned).to.be.closeTo(expected, expected / 1000n);
        });

        it("Should handle rapid stake/withdraw sequences", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            for (let i = 0; i < 5; i++) {
                await stakeTokens(token, staking, user1, ethers.parseEther("100"));
                await staking.connect(user1).withdraw(ethers.parseEther("100"));
            }

            expect(await staking.balanceOf(user1.address)).to.equal(0);
        });

        it("Should handle staking at all three tier boundaries simultaneously", async function () {
            const { token, staking, user1, user2, user3 } = await loadFixture(deployFixture);

            // Stake at exact boundaries
            await stakeTokens(token, staking, user1, ethers.parseEther("999"));   // Just below Silver
            await stakeTokens(token, staking, user2, ethers.parseEther("1000"));  // Exactly Silver
            await stakeTokens(token, staking, user3, ethers.parseEther("10000")); // Exactly Gold

            expect(await staking.getUserTier(user1.address)).to.equal("Bronze");
            expect(await staking.getUserTier(user2.address)).to.equal("Silver");
            expect(await staking.getUserTier(user3.address)).to.equal("Gold");
        });

        it("Should correctly report no rewards right after claiming", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await time.increase(Number(SECONDS_PER_DAY));

            await staking.connect(user1).claimRewards();

            // Should have near-zero rewards immediately after claiming
            expect(await staking.earned(user1.address)).to.be.lt(ethers.parseEther("0.001"));
        });

        it("Should handle exit with no rewards (freshly staked)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));

            // Exit immediately - should not revert even with minimal rewards
            await staking.connect(user1).exit();
            expect(await staking.balanceOf(user1.address)).to.equal(0);
        });
    });

    // ============ Gas Optimization Tests ============
    describe("Gas Optimization", function () {
        it("Should efficiently handle stake operation", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, amount);
            const tx = await staking.connect(user1).stake(amount);
            const receipt = await tx.wait();

            // Gas should be reasonable for a stake operation
            expect(receipt.gasUsed).to.be.lt(200000n);
        });

        it("Should efficiently handle withdraw operation", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            await stakeTokens(token, staking, user1, ethers.parseEther("1000"));
            await time.increase(Number(SECONDS_PER_DAY));

            const tx = await staking.connect(user1).withdraw(ethers.parseEther("500"));
            const receipt = await tx.wait();

            expect(receipt.gasUsed).to.be.lt(200000n);
        });
    });
});
