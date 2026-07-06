import { ethers } from "hardhat";
async function main() {
  const [d] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(await d.getAddress());
  const fee = await ethers.provider.getFeeData();
  const gp = fee.gasPrice ?? 0n;
  console.log(`Balance:   ${ethers.formatEther(bal)} ETH`);
  console.log(`Gas price: ${ethers.formatUnits(gp, "gwei")} gwei`);
  // AjoToken ~1.87M gas, ConfidentialAjo ~ maybe higher now with guard; estimate both ~4M total
  const est = gp * 4_500_000n;
  console.log(`Rough cost for both deploys (~4.5M gas): ${ethers.formatEther(est)} ETH`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
