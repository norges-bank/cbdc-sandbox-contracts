import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import debug from "debug";
const log = debug("dsp:tasks:generate-deployments");

const IS_GASLESS = (hre: HardhatRuntimeEnvironment) => {
  return hre.network.name === "mainnet";
};

task("deploy-all", "Deploy everything and set basic state")
  .addFlag("dev", "Deploy development state.")
  .addFlag("log", "Log execution")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        /* Setup wallets */
        const [deployer] = await hre.ethers.getSigners();

        if (hre.hardhatArguments.verbose || taskArgs.log) {
          log.enabled = true;
        }

        log("Running deploy all as: ", deployer.address);

        // Distribute funds
        if (taskArgs.dev && !IS_GASLESS(hre)) {
          if (
            !hre.ethers.utils.isAddress(process.env.DEV_TENOR_BESKJEDEN!) ||
            !hre.ethers.utils.isAddress(process.env.DEV_TENOR_MINKENDE!) ||
            !hre.ethers.utils.isAddress(process.env.DEV_TEST_PERSON_ADDRESS!)
          ) {
            throw new Error("Missing DEV env data");
          }

          await (
            await deployer.sendTransaction({
              to: process.env.DEV_TEST_PERSON_ADDRESS!,
              value: hre.ethers.utils.parseEther("10"),
            })
          ).wait();

          await (
            await deployer.sendTransaction({
              to: process.env.DEV_TENOR_BESKJEDEN!,
              value: hre.ethers.utils.parseEther("1"),
            })
          ).wait();

          await (
            await deployer.sendTransaction({
              to: process.env.DEV_TENOR_MINKENDE!,
              value: hre.ethers.utils.parseEther("1"),
            })
          ).wait();
        }

        // Run all deploy tasks
        await hre.run("deploy-erc1820registry", {
          dev: taskArgs.dev,
        });

        await hre.run("deploy-disperse-with-data", {
          dev: taskArgs.dev,
        });

        await hre.run("deploy-did", {
          dev: taskArgs.dev,
        });

        await hre.run("deploy-cb", {
          dev: taskArgs.dev,
        });

        // await hre.run("deploy-cbs", {
        //   dev: taskArgs.dev,
        // });
        // await hre.run("deploy-token-swap", {
        //   dev: taskArgs.dev,
        // });
        // await hre.run("add-cbs-token-operator", {
        //   dev: taskArgs.dev,
        // });
        // await hre.run("add-cbs-token-minter", {
        //   dev: taskArgs.dev,
        // });

        await hre.run("deploy-stealth", {
          dev: taskArgs.dev,
        });

        await hre.run("generate-deployments", {
          log: taskArgs.log,
        });
        /* Setup DEV state */
        if (taskArgs.dev) {
          // Do stuff
        }
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
