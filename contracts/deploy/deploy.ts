import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Confidential ERC-7984 demo faucet token used for contributions.
  const token = await deploy("AjoToken", {
    from: deployer,
    log: true,
  });
  console.log(`AjoToken:       ${token.address}`);

  // Core ROSCA state machine.
  const ajo = await deploy("ConfidentialAjo", {
    from: deployer,
    log: true,
  });
  console.log(`ConfidentialAjo: ${ajo.address}`);
};

export default func;
func.id = "deploy_ajo"; // id required to prevent reexecution
func.tags = ["Ajo", "AjoToken", "ConfidentialAjo"];
