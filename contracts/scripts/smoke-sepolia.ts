import { ethers, deployments } from "hardhat";
async function main() {
  const token = await deployments.get("AjoToken");
  const ajo = await deployments.get("ConfidentialAjo");
  const t = await ethers.getContractAt("AjoToken", token.address);
  const a = await ethers.getContractAt("ConfidentialAjo", ajo.address);
  console.log(`AjoToken:        ${token.address}`);
  console.log(`  name/symbol:   ${await t.name()} / ${await t.symbol()}`);
  console.log(`ConfidentialAjo: ${ajo.address}`);
  console.log(`  groupCount:    ${await a.groupCount()}`);
  console.log("Both contracts respond on Sepolia ✓");
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
