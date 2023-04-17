import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { CBSToken__factory } from "../typechain-types";

task("add-cbs-token-minter", "Deploy CB token and VC Registry")
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        const [singer] = await hre.ethers.getSigners();

        const cbsAddress =
          hre.deployed.cbsToken || process.env.CBS_TOKEN_ADDRESS;
        const tokenSwapAddress =
          hre.deployed.tokenSwap || process.env.TOKEN_SWAP_ADDRESS;

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

        const cbsToken = await CBSToken__factory.connect(cbsAddress, singer);

        const addMinter = await cbsToken.addMinter(tokenSwapAddress);
        await addMinter.wait();

        console.log("isMinter", await cbsToken.isMinter(tokenSwapAddress));
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
