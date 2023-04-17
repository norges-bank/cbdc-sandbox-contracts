import * as dotenv from "dotenv";

import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "hardhat-erc1820";
import "hardhat-gas-reporter";
import { extendEnvironment, HardhatUserConfig, subtask } from "hardhat/config";
import "solidity-coverage";
import "hardhat-spdx-license-identifier";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { readdirSync } from "fs";

// Runs every time hardhat is started, so we can import tasks only if typechain-types folder exists
// If there's problems with finding typechain files, then the problem is probably here:
try {
  readdirSync("typechain-types");
  // eslint-disable-next-line node/no-unsupported-features/es-syntax
  import("./tasks/index");
} catch (error) {
  console.log("No typechain-types folder found, skipping import of tasks");
}

dotenv.config();

// Used as channel to communicate deployments that depend on eachother. Only in runtime, so no need for chainId seperation
declare module "hardhat/types/runtime" {
  // This new field will be available in tasks' actions, scripts, and tests.
  export interface HardhatRuntimeEnvironment {
    deployed: {
      cbToken?: string;
      authenticatedPolicy?: string;
      cbsToken?: string;
      vcRegistry?: string;
      didRegistry?: string;
      tokenSwap?: string;
      disperseWithData?: string;
      ERC5564Registry?: string;
      Secp256k1Generator?: string;
      ERC5564Messenger?: string;
    };
    gassless: boolean;
  }
}

// Initate empty deployments object because nothing is deployed when starting runtime.
extendEnvironment((hre) => {
  hre.deployed = {};
});

// ingore unfinshed files
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(
  async (_, __, runSuper) => {
    const paths = await runSuper();

    return paths.filter((p: string) => !p.endsWith("SET FILENAME HERE.sol"));
  }
);

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.18",
      },
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: true, // Default: false
            runs: 200, // Default: 200
          },
        },
      },
      {
        version: "0.4.26",
        settings: {
          optimizer: {
            enabled: true, // Default: false
            runs: 200, // Default: 200
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      initialDate: "2022-12-31T23:59:00Z",
    },
    mainnet: {
      chainId: parseInt(process.env.CHAIN_ID ?? "0"),
      url: process.env.MAINNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      blockGasLimit: 15700000,
    },
    testnet: {
      chainId: parseInt(process.env.CHAIN_ID ?? "0"),
      url: process.env.TESTNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "NOK",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
