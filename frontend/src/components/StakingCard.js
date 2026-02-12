"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
    useAccount,
    useReadContract,
    useWaitForTransactionReceipt,
    useSendTransaction,
} from "wagmi";
import { parseEther, formatEther, encodeFunctionData } from "viem";
import { CONTRACTS, TOKEN_ABI, STAKING_ABI } from "@/config/contracts";

export default function StakingCard() {
    const { address, isConnected } = useAccount();
    const [stakeAmount, setStakeAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [activeTab, setActiveTab] = useState("stake");

    // Read token balance
    const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
        address: CONTRACTS.token,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { enabled: !!address },
    });

    // Read staked balance
    const { data: stakedBalance, refetch: refetchStakedBalance } = useReadContract({
        address: CONTRACTS.staking,
        abi: STAKING_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { enabled: !!address },
    });

    // Read earned rewards
    const { data: earnedRewards, refetch: refetchEarned } = useReadContract({
        address: CONTRACTS.staking,
        abi: STAKING_ABI,
        functionName: "earned",
        args: [address],
        query: { enabled: !!address },
    });

    // Read allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.token,
        abi: TOKEN_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.staking],
        query: { enabled: !!address },
    });

    // Read total staked
    const { data: totalStaked } = useReadContract({
        address: CONTRACTS.staking,
        abi: STAKING_ABI,
        functionName: "totalStaked",
    });

    // Read reward pool
    const { data: rewardPool } = useReadContract({
        address: CONTRACTS.staking,
        abi: STAKING_ABI,
        functionName: "rewardPoolBalance",
    });

    // Use sendTransaction instead of writeContract to control gas directly
    const { sendTransaction: sendApproveTx, data: approveTxHash, isPending: isApproving } = useSendTransaction();
    const { sendTransaction: sendStakeTx, data: stakeTxHash, isPending: isStaking } = useSendTransaction();
    const { sendTransaction: sendWithdrawTx, data: withdrawTxHash, isPending: isWithdrawing } = useSendTransaction();
    const { sendTransaction: sendClaimTx, data: claimTxHash, isPending: isClaiming } = useSendTransaction();
    const { sendTransaction: sendExitTx, data: exitTxHash, isPending: isExiting } = useSendTransaction();

    // Wait for transactions
    const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
    const { isSuccess: stakeSuccess } = useWaitForTransactionReceipt({ hash: stakeTxHash });
    const { isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash });
    const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });
    const { isSuccess: exitSuccess } = useWaitForTransactionReceipt({ hash: exitTxHash });

    // Refetch on approval success (don't clear amounts)
    useEffect(() => {
        if (approveSuccess) {
            refetchAllowance();
        }
    }, [approveSuccess]);

    // Refetch on transaction success (clear amounts)
    useEffect(() => {
        if (stakeSuccess || withdrawSuccess || claimSuccess || exitSuccess) {
            refetchTokenBalance();
            refetchStakedBalance();
            refetchEarned();
            refetchAllowance();
            setStakeAmount("");
            setWithdrawAmount("");
        }
    }, [stakeSuccess, withdrawSuccess, claimSuccess, exitSuccess]);

    // Auto-refresh earned rewards every 5 seconds
    useEffect(() => {
        if (isConnected) {
            const interval = setInterval(() => {
                refetchEarned();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isConnected, refetchEarned]);

    const handleApprove = () => {
        const amount = parseEther(stakeAmount || "0");
        const data = encodeFunctionData({
            abi: TOKEN_ABI,
            functionName: "approve",
            args: [CONTRACTS.staking, amount],
        });
        sendApproveTx({
            to: CONTRACTS.token,
            data,
            gas: 100000n,
        });
    };

    const handleStake = () => {
        const amount = parseEther(stakeAmount || "0");
        const data = encodeFunctionData({
            abi: STAKING_ABI,
            functionName: "stake",
            args: [amount],
        });
        sendStakeTx({
            to: CONTRACTS.staking,
            data,
            gas: 200000n,
        });
    };

    const handleWithdraw = () => {
        const amount = parseEther(withdrawAmount || "0");
        const data = encodeFunctionData({
            abi: STAKING_ABI,
            functionName: "withdraw",
            args: [amount],
        });
        sendWithdrawTx({
            to: CONTRACTS.staking,
            data,
            gas: 200000n,
        });
    };

    const handleClaim = () => {
        const data = encodeFunctionData({
            abi: STAKING_ABI,
            functionName: "claimRewards",
        });
        sendClaimTx({
            to: CONTRACTS.staking,
            data,
            gas: 200000n,
        });
    };

    const handleExit = () => {
        const data = encodeFunctionData({
            abi: STAKING_ABI,
            functionName: "exit",
        });
        sendExitTx({
            to: CONTRACTS.staking,
            data,
            gas: 300000n,
        });
    };

    const needsApproval = () => {
        if (!stakeAmount || allowance === undefined) return false;
        try {
            return parseEther(stakeAmount) > allowance;
        } catch {
            return false;
        }
    };

    const formatBalance = (value) => {
        if (!value) return "0.00";
        return parseFloat(formatEther(value)).toFixed(4);
    };

    if (!isConnected) {
        return (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-white mb-4 text-center">THOPE Staking</h2>
                <p className="text-gray-400 text-center mb-6">Connect your wallet to start staking</p>
                <div className="flex justify-center">
                    <ConnectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700 max-w-md mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">THOPE Staking</h2>
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                    10% APR
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Wallet Balance</p>
                    <p className="text-white font-bold text-lg">{formatBalance(tokenBalance)} THOPE</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Staked Balance</p>
                    <p className="text-white font-bold text-lg">{formatBalance(stakedBalance)} THOPE</p>
                </div>
                <div className="bg-purple-900/30 rounded-xl p-4 col-span-2">
                    <p className="text-purple-300 text-sm">Earned Rewards</p>
                    <p className="text-purple-400 font-bold text-2xl">{formatBalance(earnedRewards)} THOPE</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab("stake")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all ${activeTab === "stake"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                >
                    Stake
                </button>
                <button
                    onClick={() => setActiveTab("withdraw")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all ${activeTab === "withdraw"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                >
                    Withdraw
                </button>
            </div>

            {/* Stake Tab */}
            {activeTab === "stake" && (
                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="number"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={() => setStakeAmount(formatEther(tokenBalance || 0n))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            MAX
                        </button>
                    </div>

                    {needsApproval() ? (
                        <button
                            onClick={handleApprove}
                            disabled={isApproving}
                            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                        >
                            {isApproving ? "Approving..." : "Approve THOPE"}
                        </button>
                    ) : (
                        <button
                            onClick={handleStake}
                            disabled={isStaking || !stakeAmount}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                        >
                            {isStaking ? "Staking..." : "Stake THOPE"}
                        </button>
                    )}
                </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === "withdraw" && (
                <div className="space-y-4">
                    <div className="relative">
                        <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={() => setWithdrawAmount(formatEther(stakedBalance || 0n))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                            MAX
                        </button>
                    </div>

                    <button
                        onClick={handleWithdraw}
                        disabled={isWithdrawing || !withdrawAmount}
                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                    </button>
                </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                    onClick={handleClaim}
                    disabled={isClaiming || !earnedRewards || earnedRewards === 0n}
                    className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white font-medium py-2 rounded-lg transition-all text-sm"
                >
                    {isClaiming ? "Claiming..." : "Claim Rewards"}
                </button>
                <button
                    onClick={handleExit}
                    disabled={isExiting || !stakedBalance || stakedBalance === 0n}
                    className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white font-medium py-2 rounded-lg transition-all text-sm"
                >
                    {isExiting ? "Exiting..." : "Exit All"}
                </button>
            </div>

            {/* Pool Stats */}
            <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Staked</span>
                    <span className="text-white">{formatBalance(totalStaked)} THOPE</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Reward Pool</span>
                    <span className="text-white">{formatBalance(rewardPool)} THOPE</span>
                </div>
            </div>
        </div>
    );
}
