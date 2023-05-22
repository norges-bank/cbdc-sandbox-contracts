import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { DisperseWithData__factory } from "../typechain-types";
import {
  TASK_POST_DEPLOY_CHECK,
  TASK_PRE_DEPLOY_CHECK,
} from "./generate-deployments";

task("deploy-disperse-with-data", "Deploy disperse with data")
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        const [deployer] = await hre.ethers.getSigners();
        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "disperseWithData",
        });
        const contractAddress = hre.deployed.disperseWithData;
        // immediately-invoked-function-expression
        const contract = await (async () => {
          if (!contractAddress) {
            /* Deploy Token */
            const contract = await new DisperseWithData__factory(
              deployer
            ).deploy();
            await contract.deployed();
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "disperseWithData",
              address: contract.address,
            });
            return contract;
          } else {
            return await new DisperseWithData__factory(deployer).attach(
              contractAddress
            );
          }
        })();
        console.log(`DISPERSE_WITH_DATA_ADDRESS=${contract.address}`);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
