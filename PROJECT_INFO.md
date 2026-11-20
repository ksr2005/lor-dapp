# 📋 Project Information & Technical Documentation

## 📌 Project Overview
- **Project Name:** Decentralized Letter of Recommendation (LoR) DApp
- **Assignment:** Tutedude Web3 Mastery Program
- **Author:** Sriharsha (`ksr2005`)
- **Smart Contract Language:** Solidity `0.8.24` (EVM target: `paris`)
- **Development Framework:** Hardhat `v2.29.1`
- **Frontend Stack:** React 18, Vite 6, Ethers.js `v6.13.5`
- **Supported Networks:**
  - Localhost / Hardhat Node (`chainId: 31337`)
  - Ethereum Sepolia Testnet (`chainId: 11155111`)
- **Deployed Sepolia Contract Address:** [`0x090912b54A19fD1Ac1290d358daf5D807e451380`](https://sepolia.etherscan.io/address/0x090912b54A19fD1Ac1290d358daf5D807e451380)
- **Deployment Transaction Hash:** `0x4b865aa1cc532be7b4f2f0fcc197d6b3dc52e8f103c52654ea906d34b485039d`

---

## 🏗️ Architecture & Component Details

### 1. Smart Contract (`contracts/LetterOfRecommendation.sol`)
The contract manages the lifecycle of student registrations, recommendation requests, and faculty endorsements.

#### Core State & Structures:
```solidity
enum RequestStatus {
    None,        // 0: Registered, but LoR not yet requested
    Requested,   // 1: LoR requested by student, pending review
    Approved     // 2: LoR approved by authorized faculty/owner
}

struct Student {
    uint256 id;
    string name;
    string course;
    string email;
    address studentAddress;
    RequestStatus status;
    address approvedBy;
    string ipfsHash;
    uint256 requestedAt;
    uint256 approvedAt;
}
```

#### Function Specification:
| Function Name | Visibility & Access | Purpose |
|---|---|---|
| `addStudent(name, course, email)` | `external` | Registers student details and binds `studentAddress` to `msg.sender`. Returns newly assigned `studentId`. |
| `requestRecommendation(studentId)` | `external` | Initiates LoR request. Enforces `require(msg.sender == s.studentAddress)` so only the student can request. |
| `approveRecommendation(studentId)` | `external onlyApprover` | Approves pending recommendation. Restricted to authorized faculty approvers or owner. |
| `approveRecommendationWithIpfs(studentId, ipfsHash)` | `external onlyApprover` | Approves LoR and attaches an optional decentralized IPFS document CID. |
| `getStudent(studentId)` | `external view` | Returns complete student tuple: `(id, name, course, email, studentAddress, recommendationRequested, recommendationApproved, approvedBy, ipfsHash)`. |
| `getStudentFull(studentId)` | `external view` | Returns full `Student` struct. |
| `getAllStudents()` | `external view` | Returns array of all registered students for instant frontend loading. |
| `authorizeApprover(address)` | `external onlyOwner` | Authorizes a faculty member or reviewer address to approve LoRs. |
| `deauthorizeApprover(address)` | `external onlyOwner` | Revokes approval privileges from an address. Cannot deauthorize owner. |

---

### 2. Unit Testing Suite (`test/LetterOfRecommendation.test.js`)
Contains **25 automated Hardhat unit tests** validating all aspects of the contract:
- **Deployment & Initial State (3 tests):** Owner address, default approver status, initial counter.
- **Approver Access Control (6 tests):** Owner authorization, non-owner revert, duplicate authorization revert, deauthorization, owner protection, non-owner deauthorize revert.
- **Student Registration (3 tests):** Successful registration & event, input validation reverts (empty name, course, email), multi-student ID increments.
- **Request Lifecycle & Security (4 tests):** Valid request transition & event, **unauthorized caller revert (`msg.sender != studentAddress`)**, non-existent student ID revert, duplicate request revert.
- **Approval Workflow (6 tests):** Premature approval revert, non-approver revert, authorized approver execution, owner approval, IPFS CID attachment, double-approval revert.
- **View Functions & Helpers (3 tests):** `getStudent(uint)` tuple return, `getAllStudents()` array fetching, `getStudentFull(uint)` struct return.

---

### 3. Deployment Pipeline (`scripts/deploy.js`)
- Supports local development node (`localhost`) and testnet (`sepolia`).
- Reads credentials securely from environment variables (`.env`).
- Automatically exports:
  1. `deployedAddress.json` to the project root.
  2. `deployedAddress.json` to `frontend/src/contracts/`.
  3. `LetterOfRecommendation.json` (compiled ABI) to `frontend/src/contracts/`.

---

### 4. React Web3 Frontend (`frontend/`)
Built with modern React 18, Vite, and Ethers.js v6:
- **MetaMask Connection:** Handles account changes, chain switching, and balance updates.
- **Role Detection:** Dynamically recognizes whether the connected wallet is Contract Owner, Authorized Approver, or Student.
- **Directory Table:** Searchable, filterable list of all registered students with live on-chain status badges.
- **On-Chain Lookup (`getStudent`):** Dedicated tab calling `contract.getStudent(id)` directly and displaying all 9 returned fields.
- **Add Student & Request LoR:** Intuitive forms with transaction status feedback and block confirmations.
- **Faculty Approval Queue:** Filtered list of pending student requests with optional IPFS CID attachment.
- **Cryptographic LoR Certificate Modal:** Interactive on-chain verification certificate displaying student name, course, student address, and faculty signature.

---

## ⚡ Quick Start Instructions

### Step 1: Install Dependencies
```bash
# In the project root:
npm install

# In the frontend folder:
npm --prefix frontend install
```

### Step 2: Compile & Run Tests
```bash
npm run compile
npm test
```
*Expected: 25 passing unit tests.*

### Step 3: Run Locally
1. Start local Hardhat Ethereum node:
   ```bash
   npm run node
   ```
2. In a separate terminal, deploy to local node:
   ```bash
   npm run deploy:local
   ```
3. Start the React frontend:
   ```bash
   npm run frontend:dev
   ```
4. Open `http://localhost:3000` in your browser.

---

## 🌐 Sepolia Testnet Deployment Guide

1. Create a dedicated testnet wallet in MetaMask (never use real funds).
2. Get testnet ETH from [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) or [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your testnet wallet private key and an Alchemy/Infura Sepolia RPC URL:
   ```ini
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   PRIVATE_KEY=your_testnet_private_key_without_0x
   ETHERSCAN_API_KEY=your_etherscan_key_optional
   ```
5. Deploy:
   ```bash
   npm run deploy:sepolia
   ```
6. Verify on Sepolia Etherscan:
   ```bash
   npx hardhat verify --network sepolia <DEPLOYED_ADDRESS>
   ```

---

## 📦 Submission Files Checklist

| File / Directory | Description |
|---|---|
| `contracts/LetterOfRecommendation.sol` | Solidity 0.8.24 smart contract source code |
| `test/LetterOfRecommendation.test.js` | 25 automated Hardhat unit tests |
| `scripts/deploy.js` | Deployment script for localhost and Sepolia |
| `frontend/src/App.jsx` | React Web3 application component |
| `frontend/src/index.css` | UI design styles |
| `frontend/src/contracts/` | Synced ABI and deployment info |
| `hardhat.config.js` | Hardhat network and compiler configuration |
| `package.json` | Project scripts and dependencies |
| `.env.example` | Environment configuration template |
| `README.md` | General project documentation |
| `PROJECT_INFO.md` | Comprehensive technical specification and guide |
| `screenshots/` | Directory for submission screenshots |

