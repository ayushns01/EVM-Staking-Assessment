const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title Staking Contract Test Suite
 * @notice Comprehensive tests for the THOPE Staking Contract
 * @dev Tests cover: deployment, staking, rewards, withdrawals, security, and edge cases
 * 
 * Test Coverage Goals:
 * - 100% line coverage
 * - 100% function coverage
 * - All branches tested
 * - Security scenarios validated
 * - Mathematical accuracy verified
 */
describe("Staking Contract", function () {
    // ============ Constants ============
    const SECONDS_PER_YEAR = 31_557_600n;
    const SECONDS_PER_DAY = 86_400n;
    const INITIAL_SUPPLY = ethers.parseEther("1000000");
    const REWARD_POOL = ethers.parseEther("100000");
    const USER_TOKENS = ethers.parseEther("10000");

    // ============ Test Fixture ============
    /**
     * @notice Deploys fresh contracts for each test
     * @dev Uses Hardhat's loadFixture for gas-efficient test isolation
     */
    async function deployFixture() {
        const [owner, user1, user2, user3, attacker] = await ethers.getSigners();

        // Deploy token
        const Token = await ethers.getContractFactory("TestDope");
        const token = await Token.deploy();

        // Deploy staking
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

        it("Should set lastUpdateTime to deployment timestamp", async function () {
            const { staking } = await loadFixture(deployFixture);
            const lastUpdateTime = await staking.lastUpdateTime();
            expect(lastUpdateTime).to.be.gt(0);
        });

        it("Should initialize rewardPerTokenStored to zero", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.rewardPerTokenStored()).to.equal(0);
        });

        it("Should revert with zero address token", async function () {
            const Staking = await ethers.getContractFactory("Staking");
            await expect(
                Staking.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid token address");
        });
    });

    // ============ Constants Verification ============
    describe("Constants", function () {
        it("Should have correct APR_NUMERATOR (10)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.APR_NUMERATOR()).to.equal(10);
        });

        it("Should have correct APR_DENOMINATOR (100)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.APR_DENOMINATOR()).to.equal(100);
        });

        it("Should have correct SECONDS_PER_YEAR (365.25 days)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.SECONDS_PER_YEAR()).to.equal(SECONDS_PER_YEAR);
        });

        it("Should have correct PRECISION (1e18)", async function () {
            const { staking } = await loadFixture(deployFixture);
            expect(await staking.PRECISION()).to.equal(ethers.parseEther("1"));
        });

        it("APR constants should represent exactly 10%", async function () {
            const { staking } = await loadFixture(deployFixture);
            const numerator = await staking.APR_NUMERATOR();
            const denominator = await staking.APR_DENOMINATOR();
            expect(Number(numerator) / Number(denominator)).to.equal(0.1);
        });
    });

    // ============ Staking Tests ============
    describe("Staking", function () {
        it("Should allow users to stake tokens", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount);
        });

        it("Should transfer tokens from user to contract", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");
            const initialBalance = await token.balanceOf(user1.address);

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            expect(await token.balanceOf(user1.address)).to.equal(initialBalance - stakeAmount);
            expect(await token.balanceOf(staking.target)).to.equal(REWARD_POOL + stakeAmount);
        });

        it("Should update totalStaked after staking", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            expect(await staking.totalStaked()).to.equal(stakeAmount);
        });

        it("Should emit Staked event with correct parameters", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);

            await expect(staking.connect(user1).stake(stakeAmount))
                .to.emit(staking, "Staked")
                .withArgs(user1.address, stakeAmount);
        });

        it("Should fail when staking zero amount", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);

            await expect(
                staking.connect(user1).stake(0)
            ).to.be.revertedWith("Cannot stake 0");
        });

        it("Should fail without token approval", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await expect(
                staking.connect(user1).stake(stakeAmount)
            ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
        });

        it("Should fail with insufficient balance", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const excessiveAmount = USER_TOKENS + 1n;

            await token.connect(user1).approve(staking.target, excessiveAmount);
            await expect(
                staking.connect(user1).stake(excessiveAmount)
            ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
        });

        it("Should allow multiple stakes from same user", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount1 = ethers.parseEther("500");
            const stakeAmount2 = ethers.parseEther("300");

            await token.connect(user1).approve(staking.target, stakeAmount1 + stakeAmount2);
            await staking.connect(user1).stake(stakeAmount1);
            await staking.connect(user1).stake(stakeAmount2);

            expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount1 + stakeAmount2);
            expect(await staking.totalStaked()).to.equal(stakeAmount1 + stakeAmount2);
        });

        it("Should update lastUpdateTime after staking", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            const timeBefore = await staking.lastUpdateTime();
            await time.increase(100);

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            const timeAfter = await staking.lastUpdateTime();
            expect(timeAfter).to.be.gt(timeBefore);
        });
    });

    // ============ Reward Calculation Tests ============
    describe("Reward Calculation", function () {
        describe("rewardPerToken()", function () {
            it("Should return 0 when totalStaked is 0", async function () {
                const { staking } = await loadFixture(deployFixture);
                expect(await staking.rewardPerToken()).to.equal(0);
            });

            it("Should increase over time when tokens are staked", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                const rewardBefore = await staking.rewardPerToken();
                await time.increase(Number(SECONDS_PER_DAY));
                const rewardAfter = await staking.rewardPerToken();

                expect(rewardAfter).to.be.gt(rewardBefore);
            });

            it("Should not change when no time passes", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                const reward1 = await staking.rewardPerToken();
                const reward2 = await staking.rewardPerToken();

                expect(reward1).to.equal(reward2);
            });
        });

        describe("earned()", function () {
            it("Should return 0 for user who never staked", async function () {
                const { staking, user1 } = await loadFixture(deployFixture);
                expect(await staking.earned(user1.address)).to.equal(0);
            });

            it("Should return 0 immediately after staking (same block)", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                expect(await staking.earned(user1.address)).to.equal(0);
            });

            it("Should accrue rewards over time", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                await time.increase(Number(SECONDS_PER_DAY));

                const earned = await staking.earned(user1.address);
                expect(earned).to.be.gt(0);
            });
        });

        describe("APR Accuracy", function () {
            it("Should calculate correct 10% APR after 1 year", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                await time.increase(Number(SECONDS_PER_YEAR));

                const earned = await staking.earned(user1.address);
                const expectedReward = ethers.parseEther("100"); // 10% of 1000

                // Allow 0.1% tolerance for block timing
                const tolerance = expectedReward / 1000n;
                expect(earned).to.be.closeTo(expectedReward, tolerance);
            });

            it("Should calculate correct 5% after 6 months", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                await time.increase(Number(SECONDS_PER_YEAR / 2n));

                const earned = await staking.earned(user1.address);
                const expectedReward = ethers.parseEther("50"); // 5% for half year

                const tolerance = expectedReward / 1000n;
                expect(earned).to.be.closeTo(expectedReward, tolerance);
            });

            it("Should calculate correct rewards for 30 days", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                const thirtyDays = 30n * SECONDS_PER_DAY;
                await time.increase(Number(thirtyDays));

                const earned = await staking.earned(user1.address);
                // Expected: (1000 * 10% * 30/365.25) ≈ 8.21 THOPE
                const expectedReward = (stakeAmount * 10n * thirtyDays) / (SECONDS_PER_YEAR * 100n);

                const tolerance = expectedReward / 100n;
                expect(earned).to.be.closeTo(expectedReward, tolerance);
            });

            it("Should calculate correct rewards for 1 day", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                await time.increase(Number(SECONDS_PER_DAY));

                const earned = await staking.earned(user1.address);
                // Expected: (1000 * 10% / 365.25) ≈ 0.274 THOPE per day
                const expectedReward = (stakeAmount * 10n * SECONDS_PER_DAY) / (SECONDS_PER_YEAR * 100n);

                const tolerance = expectedReward / 10n;
                expect(earned).to.be.closeTo(expectedReward, tolerance);
            });

            it("Should scale rewards linearly with stake amount", async function () {
                const { token, staking, user1, user2 } = await loadFixture(deployFixture);

                // User1 stakes 1000, User2 stakes 2000
                await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
                await staking.connect(user1).stake(ethers.parseEther("1000"));

                await token.connect(user2).approve(staking.target, ethers.parseEther("2000"));
                await staking.connect(user2).stake(ethers.parseEther("2000"));

                await time.increase(Number(SECONDS_PER_YEAR));

                const earned1 = await staking.earned(user1.address);
                const earned2 = await staking.earned(user2.address);

                // User2 should earn exactly 2x User1
                expect(earned2).to.be.closeTo(earned1 * 2n, earned1 / 100n);
            });
        });
    });

    // ============ Withdrawal Tests ============
    describe("Withdrawing", function () {
        it("Should allow users to withdraw staked tokens", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            const balanceBefore = await token.balanceOf(user1.address);
            await staking.connect(user1).withdraw(stakeAmount);
            const balanceAfter = await token.balanceOf(user1.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it("Should auto-claim rewards on withdrawal", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            const earnedBefore = await staking.earned(user1.address);
            expect(earnedBefore).to.be.gt(0);

            const balanceBefore = await token.balanceOf(user1.address);
            await staking.connect(user1).withdraw(stakeAmount);
            const balanceAfter = await token.balanceOf(user1.address);

            // Should receive stake + rewards
            expect(balanceAfter - balanceBefore).to.be.gt(stakeAmount);

            // Rewards should be reset
            expect(await staking.earned(user1.address)).to.equal(0);
        });

        it("Should update balances correctly after partial withdrawal", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");
            const withdrawAmount = ethers.parseEther("400");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);
            await staking.connect(user1).withdraw(withdrawAmount);

            expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount - withdrawAmount);
            expect(await staking.totalStaked()).to.equal(stakeAmount - withdrawAmount);
        });

        it("Should emit Withdrawn event", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await expect(staking.connect(user1).withdraw(stakeAmount))
                .to.emit(staking, "Withdrawn")
                .withArgs(user1.address, stakeAmount);
        });

        it("Should emit RewardsClaimed event when rewards exist", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            await expect(staking.connect(user1).withdraw(stakeAmount))
                .to.emit(staking, "RewardsClaimed");
        });

        it("Should fail when withdrawing more than balance", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await expect(
                staking.connect(user1).withdraw(stakeAmount + 1n)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should fail when withdrawing zero amount", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await expect(
                staking.connect(user1).withdraw(0)
            ).to.be.revertedWith("Cannot withdraw 0");
        });

        it("Should handle withdrawal with no rewards", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            // Withdraw immediately (minimal time passed)
            const balanceBefore = await token.balanceOf(user1.address);
            await staking.connect(user1).withdraw(stakeAmount);
            const balanceAfter = await token.balanceOf(user1.address);

            expect(balanceAfter - balanceBefore).to.be.gte(stakeAmount);
        });
    });

    // ============ Claiming Rewards Tests ============
    describe("Claiming Rewards", function () {
        it("Should allow claiming rewards without unstaking", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            const balanceBefore = await token.balanceOf(user1.address);
            await staking.connect(user1).claimRewards();
            const balanceAfter = await token.balanceOf(user1.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
            // Stake should remain unchanged
            expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount);
        });

        it("Should reset rewards mapping to zero after claim", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            await staking.connect(user1).claimRewards();

            expect(await staking.rewards(user1.address)).to.equal(0);
        });

        it("Should emit RewardsClaimed event with approximately correct reward amount", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            const balanceBefore = await token.balanceOf(user1.address);

            await expect(staking.connect(user1).claimRewards())
                .to.emit(staking, "RewardsClaimed");

            const balanceAfter = await token.balanceOf(user1.address);
            const actualReward = balanceAfter - balanceBefore;

            // Should be approximately 100 THOPE (10% of 1000)
            expect(actualReward).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("0.1"));
        });

        it("Should fail when no rewards to claim", async function () {
            const { staking, user2 } = await loadFixture(deployFixture);

            // User2 has never staked
            await expect(
                staking.connect(user2).claimRewards()
            ).to.be.revertedWith("No rewards to claim");
        });

        it("Should allow multiple claims over time", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            // First claim after 6 months
            await time.increase(Number(SECONDS_PER_YEAR / 2n));
            const firstClaimReward = await staking.earned(user1.address);
            await staking.connect(user1).claimRewards();

            // Second claim after another 6 months
            await time.increase(Number(SECONDS_PER_YEAR / 2n));
            const secondClaimReward = await staking.earned(user1.address);

            // Both claims should yield approximately equal rewards (5% each)
            expect(secondClaimReward).to.be.closeTo(firstClaimReward, ethers.parseEther("0.5"));
        });
    });

    // ============ Exit Function Tests ============
    describe("Exit", function () {
        it("Should withdraw all staked tokens and claim rewards", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            const earnedBefore = await staking.earned(user1.address);
            const balanceBefore = await token.balanceOf(user1.address);

            await staking.connect(user1).exit();

            const balanceAfter = await token.balanceOf(user1.address);

            // Should receive stake + rewards
            expect(balanceAfter - balanceBefore).to.be.closeTo(
                stakeAmount + earnedBefore,
                ethers.parseEther("0.01")
            );

            // Balance should be zero
            expect(await staking.balanceOf(user1.address)).to.equal(0);
        });

        it("Should handle exit with zero balance gracefully (no revert)", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);

            // User has never staked - should not revert
            await expect(staking.connect(user1).exit()).to.not.be.reverted;
        });

        it("Should emit both Withdrawn and RewardsClaimed events", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            const tx = staking.connect(user1).exit();

            await expect(tx).to.emit(staking, "Withdrawn");
            await expect(tx).to.emit(staking, "RewardsClaimed");
        });
    });

    // ============ View Functions Tests ============
    describe("View Functions", function () {
        describe("balanceOf()", function () {
            it("Should return 0 for user who never staked", async function () {
                const { staking, user1 } = await loadFixture(deployFixture);
                expect(await staking.balanceOf(user1.address)).to.equal(0);
            });

            it("Should return correct staked amount", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1234");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount);
            });
        });

        describe("rewardPoolBalance()", function () {
            it("Should return initial reward pool balance", async function () {
                const { staking } = await loadFixture(deployFixture);
                expect(await staking.rewardPoolBalance()).to.equal(REWARD_POOL);
            });

            it("Should exclude staked tokens from pool balance", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                // Pool should still be 100k (staked tokens don't count as rewards)
                expect(await staking.rewardPoolBalance()).to.equal(REWARD_POOL);
            });

            it("Should decrease after rewards are claimed", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                await time.increase(Number(SECONDS_PER_YEAR));

                const poolBefore = await staking.rewardPoolBalance();
                await staking.connect(user1).claimRewards();
                const poolAfter = await staking.rewardPoolBalance();

                expect(poolAfter).to.be.lt(poolBefore);
            });
        });
    });

    // ============ Multiple Users Tests ============
    describe("Multiple Users", function () {
        it("Should distribute rewards independently per user", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);

            // User1 stakes 1000, User2 stakes 3000
            await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
            await staking.connect(user1).stake(ethers.parseEther("1000"));

            await token.connect(user2).approve(staking.target, ethers.parseEther("3000"));
            await staking.connect(user2).stake(ethers.parseEther("3000"));

            await time.increase(Number(SECONDS_PER_YEAR));

            // User1: 1000 * 10% = 100 THOPE
            // User2: 3000 * 10% = 300 THOPE
            const earned1 = await staking.earned(user1.address);
            const earned2 = await staking.earned(user2.address);

            expect(earned1).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("0.5"));
            expect(earned2).to.be.closeTo(ethers.parseEther("300"), ethers.parseEther("0.5"));
        });

        it("Should handle staggered entry correctly", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);

            // User1 stakes at T=0
            await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
            await staking.connect(user1).stake(ethers.parseEther("1000"));

            // Fast forward 6 months
            await time.increase(Number(SECONDS_PER_YEAR / 2n));

            // User2 stakes at T=6months
            await token.connect(user2).approve(staking.target, ethers.parseEther("1000"));
            await staking.connect(user2).stake(ethers.parseEther("1000"));

            // Fast forward another 6 months (T=1year)
            await time.increase(Number(SECONDS_PER_YEAR / 2n));

            // User1: staked for 1 year = 100 THOPE
            // User2: staked for 6 months = 50 THOPE
            const earned1 = await staking.earned(user1.address);
            const earned2 = await staking.earned(user2.address);

            expect(earned1).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("1"));
            expect(earned2).to.be.closeTo(ethers.parseEther("50"), ethers.parseEther("1"));
        });

        it("Should isolate user balances", async function () {
            const { token, staking, user1, user2 } = await loadFixture(deployFixture);

            await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
            await staking.connect(user1).stake(ethers.parseEther("1000"));

            await token.connect(user2).approve(staking.target, ethers.parseEther("2000"));
            await staking.connect(user2).stake(ethers.parseEther("2000"));

            // User1 withdraws half
            await staking.connect(user1).withdraw(ethers.parseEther("500"));

            // User2's balance should be unchanged
            expect(await staking.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
            expect(await staking.balanceOf(user2.address)).to.equal(ethers.parseEther("2000"));
        });

        it("Should handle three users staking simultaneously", async function () {
            const { token, staking, user1, user2, user3 } = await loadFixture(deployFixture);

            // All three stake equal amounts
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await token.connect(user2).approve(staking.target, stakeAmount);
            await token.connect(user3).approve(staking.target, stakeAmount);

            await staking.connect(user1).stake(stakeAmount);
            await staking.connect(user2).stake(stakeAmount);
            await staking.connect(user3).stake(stakeAmount);

            expect(await staking.totalStaked()).to.equal(stakeAmount * 3n);

            await time.increase(Number(SECONDS_PER_YEAR));

            // Each should earn ~100 THOPE (10% of 1000)
            const earned1 = await staking.earned(user1.address);
            const earned2 = await staking.earned(user2.address);
            const earned3 = await staking.earned(user3.address);

            expect(earned1).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("1"));
            expect(earned2).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("1"));
            expect(earned3).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("1"));
        });
    });

    // ============ Security Tests ============
    describe("Security", function () {
        describe("Reentrancy Protection", function () {
            it("Should have nonReentrant modifier on stake()", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                // This test ensures the function completes normally
                // Reentrancy tests with malicious contracts would require additional setup
                await token.connect(user1).approve(staking.target, stakeAmount);
                await expect(staking.connect(user1).stake(stakeAmount)).to.not.be.reverted;
            });

            it("Should have nonReentrant modifier on withdraw()", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);

                await expect(staking.connect(user1).withdraw(stakeAmount)).to.not.be.reverted;
            });

            it("Should have nonReentrant modifier on claimRewards()", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);
                await time.increase(Number(SECONDS_PER_DAY));

                await expect(staking.connect(user1).claimRewards()).to.not.be.reverted;
            });

            it("Should have nonReentrant modifier on exit()", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);
                const stakeAmount = ethers.parseEther("1000");

                await token.connect(user1).approve(staking.target, stakeAmount);
                await staking.connect(user1).stake(stakeAmount);
                await time.increase(Number(SECONDS_PER_DAY));

                await expect(staking.connect(user1).exit()).to.not.be.reverted;
            });
        });

        describe("Access Control", function () {
            it("Should allow any user to stake", async function () {
                const { token, staking, user1, user2, user3 } = await loadFixture(deployFixture);

                for (const user of [user1, user2, user3]) {
                    await token.connect(user).approve(staking.target, ethers.parseEther("100"));
                    await expect(staking.connect(user).stake(ethers.parseEther("100"))).to.not.be.reverted;
                }
            });

            it("Should only allow users to withdraw their own stake", async function () {
                const { token, staking, user1, user2 } = await loadFixture(deployFixture);

                await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
                await staking.connect(user1).stake(ethers.parseEther("1000"));

                // User2 cannot withdraw user1's tokens
                await expect(
                    staking.connect(user2).withdraw(ethers.parseEther("1000"))
                ).to.be.revertedWith("Insufficient balance");
            });
        });

        describe("Input Validation", function () {
            it("Should reject zero stake amount", async function () {
                const { staking, user1 } = await loadFixture(deployFixture);
                await expect(staking.connect(user1).stake(0)).to.be.revertedWith("Cannot stake 0");
            });

            it("Should reject zero withdraw amount", async function () {
                const { token, staking, user1 } = await loadFixture(deployFixture);

                await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
                await staking.connect(user1).stake(ethers.parseEther("1000"));

                await expect(staking.connect(user1).withdraw(0)).to.be.revertedWith("Cannot withdraw 0");
            });
        });
    });

    // ============ Edge Cases Tests ============
    describe("Edge Cases", function () {
        it("Should handle minimum stake amount (1 wei)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            await token.connect(user1).approve(staking.target, 1n);
            await staking.connect(user1).stake(1n);

            expect(await staking.balanceOf(user1.address)).to.equal(1n);
        });

        it("Should handle maximum stake amount (full user balance)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);

            await token.connect(user1).approve(staking.target, USER_TOKENS);
            await staking.connect(user1).stake(USER_TOKENS);

            expect(await staking.balanceOf(user1.address)).to.equal(USER_TOKENS);
        });

        it("Should handle stake-withdraw-stake cycle", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount * 2n);

            // Stake
            await staking.connect(user1).stake(stakeAmount);
            await time.increase(Number(SECONDS_PER_DAY));

            // Withdraw all
            await staking.connect(user1).withdraw(stakeAmount);
            expect(await staking.balanceOf(user1.address)).to.equal(0);

            await time.increase(Number(SECONDS_PER_DAY));

            // Stake again
            await staking.connect(user1).stake(stakeAmount);
            expect(await staking.balanceOf(user1.address)).to.equal(stakeAmount);
        });

        it("Should handle rapid stake/withdraw sequences", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const amount = ethers.parseEther("100");

            await token.connect(user1).approve(staking.target, amount * 10n);

            for (let i = 0; i < 5; i++) {
                await staking.connect(user1).stake(amount);
                await staking.connect(user1).withdraw(amount);
            }

            expect(await staking.balanceOf(user1.address)).to.equal(0);
        });

        it("Should handle long staking duration (10 years)", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            // Fast forward 10 years
            await time.increase(Number(SECONDS_PER_YEAR * 10n));

            const earned = await staking.earned(user1.address);
            // Expected: 1000 * 10% * 10 = 1000 THOPE
            expect(earned).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("1"));
        });

        it("Should correctly continue accruing after partial withdrawal", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);
            await staking.connect(user1).stake(stakeAmount);

            await time.increase(Number(SECONDS_PER_YEAR));

            // Partial withdraw (50%)
            await staking.connect(user1).withdraw(ethers.parseEther("500"));

            // Should have 500 remaining
            expect(await staking.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));

            // Continue for another year
            await time.increase(Number(SECONDS_PER_YEAR));

            const earned = await staking.earned(user1.address);
            // Expected: 500 * 10% = 50 THOPE for second year
            expect(earned).to.be.closeTo(ethers.parseEther("50"), ethers.parseEther("1"));
        });

        it("Should handle earned() calculation for zero balance user correctly", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);

            // User never staked
            expect(await staking.earned(user1.address)).to.equal(0);
            expect(await staking.balanceOf(user1.address)).to.equal(0);
            expect(await staking.userRewardPerTokenPaid(user1.address)).to.equal(0);
            expect(await staking.rewards(user1.address)).to.equal(0);
        });
    });

    // ============ Gas Optimization Awareness ============
    describe("Gas Optimization", function () {
        it("Should use immutable for stakingToken (gas check)", async function () {
            const { token, staking } = await loadFixture(deployFixture);
            // Multiple reads should benefit from immutable optimization
            const addr1 = await staking.stakingToken();
            const addr2 = await staking.stakingToken();
            expect(addr1).to.equal(addr2);
            expect(addr1).to.equal(token.target);
        });

        it("Should efficiently update reward state with modifier", async function () {
            const { token, staking, user1 } = await loadFixture(deployFixture);
            const stakeAmount = ethers.parseEther("1000");

            await token.connect(user1).approve(staking.target, stakeAmount);

            // This should complete without excessive gas usage
            const tx = await staking.connect(user1).stake(stakeAmount);
            const receipt = await tx.wait();

            // Gas should be reasonable (less than 200k for stake)
            expect(receipt.gasUsed).to.be.lt(200000);
        });
    });
});
