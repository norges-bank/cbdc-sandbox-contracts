import debug from "debug";
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import {
  ERC5564Messenger__factory,
  ERC5564Registry__factory,
  Secp256k1Generator__factory,
} from "../typechain-types";
import {
  TASK_POST_DEPLOY_CHECK,
  TASK_PRE_DEPLOY_CHECK,
} from "./generate-deployments";
const log = debug("dsp:tasks:deploy-stealth");

task("deploy-stealth", "Deploy stealth contracts.")
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        /* Constants */
        /* Setup wallets */
        const [deployer] = await hre.ethers.getSigners();

        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "ERC5564Messenger",
        });
        const messengerAddress = hre.deployed.ERC5564Messenger;
        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "ERC5564Registry",
        });
        const registryAddress = hre.deployed.ERC5564Registry;
        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "Secp256k1Generator",
        });
        const generatorAddress = hre.deployed.Secp256k1Generator;

        const messenger = await (async () => {
          if (!messengerAddress) {
            log("Deploying ERC5564Messenger...");
            const messenger = await new ERC5564Messenger__factory(
              deployer
            ).deploy();
            await messenger.deployed();
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "ERC5564Messenger",
              address: messenger.address,
            });
            return messenger;
          } else {
            return new ERC5564Messenger__factory(deployer).attach(
              messengerAddress
            );
          }
        })();

        const registry = await (async () => {
          if (!registryAddress) {
            log("Deploying ERC5564Registry");
            const registry = await new ERC5564Registry__factory(
              deployer
            ).deploy();
            await registry.deployed();
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "ERC5564Registry",
              address: registry.address,
            });
            return registry;
          } else {
            return new ERC5564Registry__factory(deployer).attach(
              registryAddress
            );
          }
        })();

        const generator = await (async () => {
          if (!generatorAddress) {
            log("Deploying Secp256k1Generator");
            const generator = await new Secp256k1Generator__factory(
              deployer
            ).deploy(registry.address);
            await generator.deployed();
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "Secp256k1Generator",
              address: generator.address,
            });
            return generator;
          } else {
            return new Secp256k1Generator__factory(deployer).attach(
              generatorAddress
            );
          }
        })();

        console.log(`ERC5564_REGISTRY_ADDRESS=${registry.address}`);
        console.log(`SECP_256K1_GENERATOR_ADDRESS=${generator.address}`);
        console.log(`ERC5564_MESSENGER_ADDRESS=${messenger.address}`);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );
