Step 1 :  Task -: Start from Tomorrow ( Duration : 3-5) 
Task Objectives
✅ 1. Smart Contract Development (Solidity)
Build an EVM-compatible staking smart contract that:
Lets users stake a custom token (ERC-20).
Calculates and distributes rewards daily.
Allows users to unstake anytime without penalties.
Keeps all logic on-chain (transparent & secure).


Required Features
 ✔ Stake tokens
 ✔ Track staked amount per user
 ✔ Reward calculation (simple APR — e.g., 10% annual)
 ✔ Claim rewards function
 ✔ Unstake function
Bonus (optional)
 ⭐ Tiered reward levels based on amount staked
 ⭐ Auto-compounding rewards

🧪 2. EVM Test Token (ERC-20)
Create a simple ERC-20 token called TestDope (THOPE):
Initial supply: 1,000,000 THOPE
Deployed alongside your staking contract


Used for staking & reward distribution


🛠 3. Deployment & Testing
Deploy your contracts to an EVM testnet (e.g., Sepolia, Goerli, Mumbai):
Write scripts to deploy contracts (Hardhat/Foundry/Truffle)
Provide clear deployment steps in a README.md
Include contract addresses and README documentation



🧑‍💻 4. Frontend (Basic UI)
Build a simple React frontend to interact with your smart contracts:
Pages
 📌 Connect Wallet (MetaMask)
 📌 Dashboard showing:
User’s staked balance
Pending rewards
Buttons to Stake / Claim / Unstake


Optional: show total staked in the contract.

📄 5. Deliverables
Submit a GitHub repo with:
✔ Smart contracts (contracts/)
 ✔ Tests (tests/)
 ✔ Deployment scripts (scripts/)
 ✔ Frontend app (app/)
 ✔ README with:
How to compile & deploy
How to interact with UI
Explanation of reward logic
