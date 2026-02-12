"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat } from "wagmi/chains";

// Note: For WalletConnect to work in production, you need a valid project ID from:
// https://cloud.walletconnect.com/
// For local development with MetaMask, the projectId is not strictly required

export const config = getDefaultConfig({
    appName: "THOPE Staking",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
    chains: [sepolia, hardhat],
    ssr: true,
});
