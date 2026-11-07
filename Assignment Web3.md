# 📚 **Assignment: Build a Letter of Recommendation (LoR) DApp**

## 🎯 **Objective**

Students will design and deploy a decentralized application (DApp) that allows:

·       Adding student details

·       Requesting recommendations

·       Approving requests by authorized users

·       Viewing student and recommendation status

## 📄 **Assignment Instructions**

### **Part A – Smart Contract Development**

1\. Create a new Hardhat project.

2\. Write a Solidity smart contract with the following features:

·       addStudent(string name, string course, string email)

·       requestRecommendation(uint studentId)

·       approveRecommendation(uint studentId)

·       getStudent(uint studentId) returns (...)

·       Owner can authorize and deauthorize approvers.

3\. Compile and test the contract using Hardhat.

### **Part B – Deploy to Sepolia Testnet**

1\. Use Hardhat \+ Infura or Alchemy to deploy the contract.

2\. Store the deployed contract address.

3\. Submit a screenshot or link to Etherscan showing the deployed contract.

### **Part C – Build a React Frontend**

1\. Create a React frontend using ethers.js that connects to MetaMask.

2\. Provide UI to:

·       Add student

·       Request recommendation (by ID)

·       Approve recommendation (if authorized)

·       View student details

3\. Use basic CSS or Bootstrap for styling.

## 🔐 **Bonus (Optional)**

·       Add IPFS integration to store actual LoR text files.

·       Add login-based views for students and faculty.

·       Verification on Etherscan.

## ✅ 🧠 **Learning Outcomes**

·       Understanding of Solidity smart contracts

·       Hands-on experience with Hardhat and Sepolia deployment

·       Connecting blockchain logic with React frontend

·       Use of MetaMask and ethers.js

## 📤 **Submission Guidelines**

1\. Push the complete project (smart contract, deployment scripts, and React frontend) to a GitHub repository.

2\. Inside the repository, create a folder named screenshots/ and add clear screenshots of:

·       The contract deployed on Sepolia (Etherscan page).

·       The working frontend (showing add student, request/approve, and view features).

3\. Add a README.md describing how to run tests, deploy, and start the frontend.

4\. Name your pull request (or main commit) as \<YourName\> \- LoR DApp.