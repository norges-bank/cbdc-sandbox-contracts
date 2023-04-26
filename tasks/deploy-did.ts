import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { EthereumDIDRegistry__factory } from "../typechain-types";
import {
  TASK_POST_DEPLOY_CHECK,
  TASK_PRE_DEPLOY_CHECK,
} from "./generate-deployments";

task(
  "deploy-did",
  "Deploy DID registry, must be deployed for other vc operations to resolve correctly with ethr."
)
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        const [deployer] = await hre.ethers.getSigners();

        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "didRegistry",
        });
        const contractAddress = hre.deployed.didRegistry;
        // immediately-invoked-function-expression
        const contract = await (async () => {
          if (!contractAddress) {
            /* Deploy Token */
            const contract = await new EthereumDIDRegistry__factory(
              deployer
            ).deploy();
            await contract.deployed();
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "didRegistry",
              address: contract.address,
            });
            return contract;
          } else {
            return await new EthereumDIDRegistry__factory(deployer).attach(
              contractAddress
            );
          }
        })();

        console.log(`DID_REGISTRY_ADDRESS=${contract.address}`);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
