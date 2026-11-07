const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;

  console.log("==================================================");
  console.log("Deploying LetterOfRecommendation contract...");
  console.log(`Network:          ${networkName}`);
  console.log(`Deployer Address: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log("==================================================");

  // Deploy contract
  const LetterOfRecommendation = await hre.ethers.getContractFactory("LetterOfRecommendation");
  const lor = await LetterOfRecommendation.deploy();

  await lor.waitForDeployment();
  const contractAddress = await lor.getAddress();
  const deployTx = lor.deploymentTransaction();

  console.log("Contract deployed successfully!");
  console.log(`Contract Address: ${contractAddress}`);
  if (deployTx) {
    console.log(`Transaction Hash: ${deployTx.hash}`);
  }

  if (networkName === "sepolia") {
    console.log(`Etherscan Link:   https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log(`Tx Link:          https://sepolia.etherscan.io/tx/${deployTx ? deployTx.hash : ""}`);
  }

  // Save deployed address and ABI for frontend and records
  const deploymentInfo = {
    network: networkName,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    transactionHash: deployTx ? deployTx.hash : "",
    deployedAt: new Date().toISOString(),
  };

  // Root output
  fs.writeFileSync(
    path.join(__dirname, "..", "deployedAddress.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save to frontend contracts directory if it exists
  const frontendContractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendContractsDir, "deployedAddress.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Copy artifact ABI to frontend
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "LetterOfRecommendation.sol",
    "LetterOfRecommendation.json"
  );
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(frontendContractsDir, "LetterOfRecommendation.json"),
      JSON.stringify(artifact, null, 2)
    );
  }

  console.log("Deployment info and ABI saved successfully to frontend/src/contracts/");
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
