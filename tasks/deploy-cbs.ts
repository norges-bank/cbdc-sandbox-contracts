import debug from "debug";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { CBSToken__factory } from "../typechain-types";
import {
  TASK_POST_DEPLOY_CHECK,
  TASK_PRE_DEPLOY_CHECK,
} from "./generate-deployments";
const log = debug("dsp:tasks:deploy-cbs");

task("deploy-cbs", "Deploy CBS token")
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        /* Setup wallets */
        const [deployer] = await hre.ethers.getSigners();

        /* Deploy CBS Token */

        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "cbsToken",
        });
        const contractAddress = hre.deployed.cbsToken;

        const contract = await (async () => {
          if (!contractAddress) {
            const controller = `${process.env.CONTROLLER}`;
            const partition1 = `${process.env.PARTITION_1}`;
            const partition2 = `${process.env.PARTITION_2}`;
            const partition3 = `${process.env.PARTITION_3}`;
            const cBSTokenName = `${process.env.CBSTOKEN_NAME}`;
            const cBSTokenSymbol = `${process.env.CBSTOKEN_SYMBOL}`;

            const partitions = [partition1, partition2, partition3];

            const { chainId } = await hre.ethers.provider.getNetwork();

            /* Deploy Token */
            log("Deploying CBS Token at chainId", chainId);
            const contract = await new CBSToken__factory(deployer).deploy(
              cBSTokenName,
              cBSTokenSymbol,
              4,
              [controller],
              partitions,
              chainId,
              {
                gasPrice: hre.ethers.utils.parseUnits("0.0", "gwei"),
                gasLimit: 18000000,
              }
            );
            log("Waiting CBS Token deployed");
            await contract.deployed();
            log("CBS Token deployed at: ", contract.address);
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "cbsToken",
              address: contract.address,
            });
            return contract;
          } else {
            return await new CBSToken__factory(deployer).attach(
              contractAddress
            );
          }
        })();
        console.log(`CBS_TOKEN_ADDRESS=${contract.address}`);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
