import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { CBSToken__factory } from "../typechain-types";

task("add-cbs-token-operator", "Deploy CB token and VC Registry")
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        const [signer] = await hre.ethers.getSigners();

        const cbsAddress =
          hre.deployed.cbsToken || process.env.CBS_TOKEN_ADDRESS;
        const tokenSwapAddress =
          hre.deployed.tokenSwap || process.env.TOKEN_SWAP_ADDRESS;
        const partition = process.env.ISSUE_PARTITION;

        if (!cbsAddress) {
          throw new Error(
            "Adding tokenswap as minter of cbs token requires that its deployed during runtime or CBS_TOKEN_ADDRESS set in env variables"
          );
        }
        if (!tokenSwapAddress) {
          throw new Error(
            "Adding tokenswap as minter of cbs token requires that its deployed during runtime or TOKEN_SWAP_ADDRESS set in env variables"
          );
        }
        if (!partition) {
          throw new Error(
            "Please set ISSUE_PARTITION in env variables to add tokenSwap as operator"
          );
        }

        const cbsToken = await CBSToken__factory.connect(cbsAddress, signer);

        const addOperator = await cbsToken.authorizeOperatorByPartition(
          partition,
          tokenSwapAddress
        );
        await addOperator.wait();

        console.log(
          "isOperator",
          await cbsToken.isOperatorForPartition(
            partition,
            tokenSwapAddress,
            signer.address
          )
        );
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
