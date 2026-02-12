"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import StakingCard from "@/components/StakingCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-bold text-white">THOPE Staking</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Stake <span className="text-blue-400">THOPE</span> & Earn
        </h1>
        <p className="text-gray-400 text-lg mb-2">
          Fixed <span className="text-green-400 font-bold">10% APR</span> • Calculated per second • No lockup
        </p>
        <p className="text-gray-500 text-sm">
          Deployed on Sepolia Testnet
        </p>
      </section>

      {/* Staking Card */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <StakingCard />
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>THOPE Staking Protocol • Built with Next.js & Wagmi</p>
          <div className="flex justify-center gap-4 mt-2">
            <a
              href="https://sepolia.etherscan.io/address/0xA4D90aee9E74Abb933ACa624838f5a4F85BcB351"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Token Contract
            </a>
            <a
              href="https://sepolia.etherscan.io/address/0xb61Bfe9F5CaaBFf4360997F1c6768D2620d2ae72"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Staking Contract
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
