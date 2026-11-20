require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const rawPrivateKey = process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.trim() : "";
const formattedPrivateKey = rawPrivateKey
  ? (rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`)
  : "";
const accounts = formattedPrivateKey ? [formattedPrivateKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: accounts,
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: {
    enabled: true,
  },
};
