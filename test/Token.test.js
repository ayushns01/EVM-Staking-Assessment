const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title TestDope Token Test Suite
 * @notice Comprehensive tests for the THOPE ERC-20 Token
 * @dev Tests cover: deployment, ERC-20 compliance, transfers, and allowances
 * 
 * Standards Tested:
 * - ERC-20 interface compliance
 * - OpenZeppelin ERC20 implementation patterns
 * - Edge cases and security considerations
 */
describe("TestDope Token", function () {
    // ============ Constants ============
    const TOKEN_NAME = "TestDope";
    const TOKEN_SYMBOL = "THOPE";
    const TOKEN_DECIMALS = 18n;
    const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 THOPE

    // ============ Test Fixture ============
    async function deployFixture() {
        const [owner, user1, user2, spender] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestDope");
        const token = await Token.deploy();

        return { token, owner, user1, user2, spender };
    }

    // ============ Deployment Tests ============
    describe("Deployment", function () {
        it("Should set the correct token name", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.name()).to.equal(TOKEN_NAME);
        });

        it("Should set the correct token symbol", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
        });

        it("Should have 18 decimals (standard)", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.decimals()).to.equal(TOKEN_DECIMALS);
        });

        it("Should mint entire initial supply to deployer", async function () {
            const { token, owner } = await loadFixture(deployFixture);
            expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
        });

        it("Should set total supply to 1,000,000 THOPE", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
        });

        it("Should expose INITIAL_SUPPLY constant", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(await token.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
        });

        it("Should have zero balance for non-owners", async function () {
            const { token, user1, user2 } = await loadFixture(deployFixture);
            expect(await token.balanceOf(user1.address)).to.equal(0);
            expect(await token.balanceOf(user2.address)).to.equal(0);
        });
    });

    // ============ Transfer Tests ============
    describe("Transfers", function () {
        describe("Basic Transfers", function () {
            it("Should transfer tokens between accounts", async function () {
                const { token, owner, user1 } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await token.transfer(user1.address, amount);

                expect(await token.balanceOf(user1.address)).to.equal(amount);
                expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
            });

            it("Should update sender and receiver balances correctly", async function () {
                const { token, owner, user1, user2 } = await loadFixture(deployFixture);
                const amount1 = ethers.parseEther("100");
                const amount2 = ethers.parseEther("50");

                // owner -> user1
                await token.transfer(user1.address, amount1);
                // user1 -> user2
                await token.connect(user1).transfer(user2.address, amount2);

                expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount1);
                expect(await token.balanceOf(user1.address)).to.equal(amount1 - amount2);
                expect(await token.balanceOf(user2.address)).to.equal(amount2);
            });

            it("Should emit Transfer event with correct parameters", async function () {
                const { token, owner, user1 } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await expect(token.transfer(user1.address, amount))
                    .to.emit(token, "Transfer")
                    .withArgs(owner.address, user1.address, amount);
            });

            it("Should allow transfer of zero tokens", async function () {
                const { token, owner, user1 } = await loadFixture(deployFixture);

                await expect(token.transfer(user1.address, 0)).to.not.be.reverted;

                expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
                expect(await token.balanceOf(user1.address)).to.equal(0);
            });

            it("Should allow self-transfer", async function () {
                const { token, owner } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await expect(token.transfer(owner.address, amount)).to.not.be.reverted;
                expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
            });
        });

        describe("Transfer Failures", function () {
            it("Should fail if sender doesn't have enough tokens", async function () {
                const { token, user1, user2 } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                // user1 has 0 tokens
                await expect(
                    token.connect(user1).transfer(user2.address, amount)
                ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
            });

            it("Should fail when transferring more than balance", async function () {
                const { token, owner, user1 } = await loadFixture(deployFixture);
                const excessAmount = INITIAL_SUPPLY + 1n;

                await expect(
                    token.transfer(user1.address, excessAmount)
                ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
            });

            it("Should fail when transferring to zero address", async function () {
                const { token } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await expect(
                    token.transfer(ethers.ZeroAddress, amount)
                ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
            });
        });

        describe("Chained Transfers", function () {
            it("Should handle multiple sequential transfers", async function () {
                const { token, owner, user1, user2 } = await loadFixture(deployFixture);

                await token.transfer(user1.address, ethers.parseEther("1000"));
                await token.connect(user1).transfer(user2.address, ethers.parseEther("500"));
                await token.connect(user2).transfer(owner.address, ethers.parseEther("250"));

                expect(await token.balanceOf(owner.address)).to.equal(
                    INITIAL_SUPPLY - ethers.parseEther("1000") + ethers.parseEther("250")
                );
                expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
                expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("250"));
            });
        });
    });

    // ============ Allowance Tests ============
    describe("Allowances", function () {
        describe("Approval", function () {
            it("Should approve tokens for delegated transfer", async function () {
                const { token, owner, spender } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await token.approve(spender.address, amount);

                expect(await token.allowance(owner.address, spender.address)).to.equal(amount);
            });

            it("Should emit Approval event with correct parameters", async function () {
                const { token, owner, spender } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await expect(token.approve(spender.address, amount))
                    .to.emit(token, "Approval")
                    .withArgs(owner.address, spender.address, amount);
            });

            it("Should allow overwriting previous approval", async function () {
                const { token, owner, spender } = await loadFixture(deployFixture);

                await token.approve(spender.address, ethers.parseEther("100"));
                await token.approve(spender.address, ethers.parseEther("200"));

                expect(await token.allowance(owner.address, spender.address)).to.equal(
                    ethers.parseEther("200")
                );
            });

            it("Should allow approval of zero amount", async function () {
                const { token, owner, spender } = await loadFixture(deployFixture);

                await token.approve(spender.address, ethers.parseEther("100"));
                await token.approve(spender.address, 0);

                expect(await token.allowance(owner.address, spender.address)).to.equal(0);
            });

            it("Should allow approval of max uint256", async function () {
                const { token, owner, spender } = await loadFixture(deployFixture);
                const maxAmount = ethers.MaxUint256;

                await token.approve(spender.address, maxAmount);

                expect(await token.allowance(owner.address, spender.address)).to.equal(maxAmount);
            });
        });

        describe("TransferFrom", function () {
            it("Should transfer tokens using transferFrom", async function () {
                const { token, owner, user1, spender } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await token.approve(spender.address, amount);
                await token.connect(spender).transferFrom(owner.address, user1.address, amount);

                expect(await token.balanceOf(user1.address)).to.equal(amount);
                expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
            });

            it("Should decrease allowance after transferFrom", async function () {
                const { token, owner, user1, spender } = await loadFixture(deployFixture);
                const approveAmount = ethers.parseEther("100");
                const transferAmount = ethers.parseEther("60");

                await token.approve(spender.address, approveAmount);
                await token.connect(spender).transferFrom(owner.address, user1.address, transferAmount);

                expect(await token.allowance(owner.address, spender.address)).to.equal(
                    approveAmount - transferAmount
                );
            });

            it("Should emit Transfer event on transferFrom", async function () {
                const { token, owner, user1, spender } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await token.approve(spender.address, amount);

                await expect(token.connect(spender).transferFrom(owner.address, user1.address, amount))
                    .to.emit(token, "Transfer")
                    .withArgs(owner.address, user1.address, amount);
            });

            it("Should fail transferFrom without sufficient allowance", async function () {
                const { token, owner, user1, spender } = await loadFixture(deployFixture);
                const amount = ethers.parseEther("100");

                await expect(
                    token.connect(spender).transferFrom(owner.address, user1.address, amount)
                ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
            });

            it("Should fail transferFrom when exceeding allowance", async function () {
                const { token, owner, user1, spender } = await loadFixture(deployFixture);

                await token.approve(spender.address, ethers.parseEther("50"));

                await expect(
                    token.connect(spender).transferFrom(owner.address, user1.address, ethers.parseEther("100"))
                ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
            });

            it("Should fail transferFrom when owner has insufficient balance", async function () {
                const { token, user1, user2, spender } = await loadFixture(deployFixture);

                // user1 has 0 balance but approves spender
                await token.connect(user1).approve(spender.address, ethers.parseEther("100"));

                await expect(
                    token.connect(spender).transferFrom(user1.address, user2.address, ethers.parseEther("100"))
                ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
            });

            it("Should not decrease max uint256 allowance", async function () {
                const { token, owner, user1, spender } = await loadFixture(deployFixture);
                const maxAmount = ethers.MaxUint256;

                await token.approve(spender.address, maxAmount);
                await token.connect(spender).transferFrom(owner.address, user1.address, ethers.parseEther("100"));

                // Allowance should remain max (OpenZeppelin behavior)
                expect(await token.allowance(owner.address, spender.address)).to.equal(maxAmount);
            });
        });
    });

    // ============ ERC-20 Compliance Tests ============
    describe("ERC-20 Compliance", function () {
        it("Should implement name()", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(typeof await token.name()).to.equal("string");
        });

        it("Should implement symbol()", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(typeof await token.symbol()).to.equal("string");
        });

        it("Should implement decimals()", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(typeof await token.decimals()).to.equal("bigint");
        });

        it("Should implement totalSupply()", async function () {
            const { token } = await loadFixture(deployFixture);
            expect(typeof await token.totalSupply()).to.equal("bigint");
        });

        it("Should implement balanceOf()", async function () {
            const { token, owner } = await loadFixture(deployFixture);
            expect(typeof await token.balanceOf(owner.address)).to.equal("bigint");
        });

        it("Should implement transfer()", async function () {
            const { token, user1 } = await loadFixture(deployFixture);
            const tx = await token.transfer(user1.address, 1);
            expect(tx.hash).to.exist;
        });

        it("Should implement approve()", async function () {
            const { token, spender } = await loadFixture(deployFixture);
            const tx = await token.approve(spender.address, 1);
            expect(tx.hash).to.exist;
        });

        it("Should implement allowance()", async function () {
            const { token, owner, spender } = await loadFixture(deployFixture);
            expect(typeof await token.allowance(owner.address, spender.address)).to.equal("bigint");
        });

        it("Should implement transferFrom()", async function () {
            const { token, owner, user1, spender } = await loadFixture(deployFixture);
            await token.approve(spender.address, 1);
            const tx = await token.connect(spender).transferFrom(owner.address, user1.address, 1);
            expect(tx.hash).to.exist;
        });
    });

    // ============ Edge Cases ============
    describe("Edge Cases", function () {
        it("Should handle minimum transfer (1 wei)", async function () {
            const { token, owner, user1 } = await loadFixture(deployFixture);

            await token.transfer(user1.address, 1n);

            expect(await token.balanceOf(user1.address)).to.equal(1n);
        });

        it("Should handle maximum transfer (full balance)", async function () {
            const { token, owner, user1 } = await loadFixture(deployFixture);

            await token.transfer(user1.address, INITIAL_SUPPLY);

            expect(await token.balanceOf(user1.address)).to.equal(INITIAL_SUPPLY);
            expect(await token.balanceOf(owner.address)).to.equal(0);
        });

        it("Should handle rapid sequential transfers", async function () {
            const { token, owner, user1 } = await loadFixture(deployFixture);
            const smallAmount = ethers.parseEther("1");

            for (let i = 0; i < 10; i++) {
                await token.transfer(user1.address, smallAmount);
            }

            expect(await token.balanceOf(user1.address)).to.equal(smallAmount * 10n);
        });

        it("Should maintain total supply invariant after transfers", async function () {
            const { token, owner, user1, user2 } = await loadFixture(deployFixture);

            await token.transfer(user1.address, ethers.parseEther("1000"));
            await token.transfer(user2.address, ethers.parseEther("2000"));
            await token.connect(user1).transfer(user2.address, ethers.parseEther("500"));

            // Total supply should never change
            expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);

            // Sum of all balances should equal total supply
            const ownerBalance = await token.balanceOf(owner.address);
            const user1Balance = await token.balanceOf(user1.address);
            const user2Balance = await token.balanceOf(user2.address);

            expect(ownerBalance + user1Balance + user2Balance).to.equal(INITIAL_SUPPLY);
        });
    });
});
