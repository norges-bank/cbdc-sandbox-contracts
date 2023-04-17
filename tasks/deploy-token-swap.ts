import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { TokenSwap__factory } from "../typechain-types";
import {
  TASK_POST_DEPLOY_CHECK,
  TASK_PRE_DEPLOY_CHECK,
} from "./generate-deployments";

task("deploy-token-swap", "Deploy token swap")
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        /* Setup wallets */
        const [deployer] = await hre.ethers.getSigners();

        let cBTokenAddress = hre.deployed.cbToken;
        let cBSTokenAddress = hre.deployed.cbsToken;
        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "tokenSwap",
        });
        const contractAddress = hre.deployed.tokenSwap;

        /* Check contract dependencies */
        if (!cBTokenAddress) {
          if (taskArgs.dev) {
            console.log(
              "cBTokenAddress not found in runtime deployments or env variable. Doing ad-hoc deployment because DEV flag active"
            );
            await hre.run("deploy-cb", { dev: taskArgs.dev });
            cBTokenAddress = hre.deployed.cbToken;
          }
          if (!cBTokenAddress) {
            throw new Error("Token swap requires CB token to be deployed");
          }
        }
        if (!cBSTokenAddress) {
          if (taskArgs.dev) {
            console.log(
              "cBSTokenAddress not found in runtime deployments or env variable. Doing ad-hoc deployment because DEV flag active"
            );
            await hre.run("deploy-cbs", { dev: taskArgs.dev });
            cBSTokenAddress = hre.deployed.cbsToken;
          }
          if (!cBSTokenAddress) {
            throw new Error("Token swap requires CB token to be deployed");
          }
        }

        const contract = await (async () => {
          if (!contractAddress) {
            /* Deploy Token */
            const contract = await new TokenSwap__factory(deployer).deploy(
              cBTokenAddress,
              cBSTokenAddress
            );
            await contract.deployed();
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "tokenSwap",
              address: contract.address,
            });
            return contract;
          } else {
            return await new TokenSwap__factory(deployer).attach(
              contractAddress
            );
          }
        })();
        hre.deployed.tokenSwap = contract.address;
        console.log(`TOKEN_SWAP_ADDRESS=${contract.address}`);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
