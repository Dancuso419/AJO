import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const addr = await deployer.getAddress();
  const bal = await ethers.provider.getBalance(addr);
  const net = await ethers.provider.getNetwork();
  console.log(`Network:  ${net.name} (chainId ${net.chainId})`);
  console.log(`Deployer: ${addr}`);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
