import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  rmSync,
} from "fs";
import { subtask, task } from "hardhat/config";
import {
  HardhatRuntimeEnvironment,
  RunSuperFunction,
  TaskArguments,
} from "hardhat/types";
import debug from "debug";
import { TASK_CLEAN } from "hardhat/builtin-tasks/task-names";
import { exec } from "child_process";

export const TASK_PRE_DEPLOY_CHECK = "pre-deploy-check";
export const TASK_POST_DEPLOY_CHECK = "post-deploy-check";
export const TASK_GENERATE_DEPLOYMENTS = "generate-deployments";
export const TASK_GENERATE_NPM_PACKAGE = "generate-npm-package";

const log = debug("dsp:tasks:generate-deployments");
// constants for file paths
const deploymentsFolder = "deployments";
const contractsPostfix = "Contracts";
const indexFilePath = `${deploymentsFolder}/index.ts`;
const deploysFilePath = `${deploymentsFolder}/deploys.ts`;

// Generate files with persistant addresses of deployed contracts
task(TASK_GENERATE_DEPLOYMENTS, "Write deployed contracts to typescript files")
  .addFlag("log", "Log execution")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        if (hre.hardhatArguments.verbose || taskArgs.log) {
          log.enabled = true;
        }

        // ensure folder and files exist
        if (!existsSync(`./${deploymentsFolder}`)) {
          mkdirSync(`${deploymentsFolder}`);
        }

        if (!existsSync(indexFilePath)) {
          writeFileSync(indexFilePath, "");
        }

        if (!existsSync(deploysFilePath)) {
          writeFileSync(deploysFilePath, "");
        }

        const indexFile = readFileSync(indexFilePath, "utf8");
        const deploysFile = readFileSync(deploysFilePath, "utf8");

        // ensure we have files for each network
        for (const networkName of Object.keys(hre.config.networks)) {
          log("START generate deployments for network: ", networkName);
          if (networkName === "hardhat") continue;

          // ensure file exists
          if (
            !existsSync(
              `${deploymentsFolder}/${networkName}${contractsPostfix}.ts`
            )
          ) {
            writeFileSync(
              `${deploymentsFolder}/${networkName}${contractsPostfix}.ts`,
              `export const ${networkName}${contractsPostfix} = ${JSON.stringify(
                {}
              )}	 as const;`
            );
          }
          // write imports to index
          if (
            !deploysFile.includes(
              `export * from "./${networkName}${contractsPostfix}";`
            )
          ) {
            appendFileSync(
              deploysFilePath,
              `\nexport * from "./${networkName}${contractsPostfix}";`
            );
          }
          // write deploys to file
          if (hre.network.name === networkName) {
            if (Object.values(hre.deployed).length === 0) {
              log("No contracts deployed, nothing to generate");
              return;
            }
            const enviromentsText = `export const ${networkName}${contractsPostfix} = ${JSON.stringify(
              hre.deployed
            )}	as const;`;

            writeFileSync(
              `deployments/${networkName}${contractsPostfix}.ts`,
              enviromentsText
            );
          }
          log("END generate deployments for network: ", networkName);
        }

        if (
          !indexFile.includes(`export * from "./../typechain-types/index";`)
        ) {
          appendFileSync(
            indexFilePath,
            `\nexport * from "./../typechain-types/index";`
          );
        }
        if (!indexFile.includes(`export * from "./deploys";`)) {
          appendFileSync(indexFilePath, `\nexport * from "./deploys";`);
        }
        await hre.run(TASK_GENERATE_NPM_PACKAGE, { log: taskArgs.log });
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );

subtask(
  TASK_PRE_DEPLOY_CHECK,
  "Sets hardhat runtime deployed addresses from env variables"
)
  .addFlag("redeploy", "Redeploy deployment")
  .addParam("contract", "Contract name")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment,
      runSuper: RunSuperFunction<TaskArguments>
    ) => {
      const ephemeralNetworkNames = ["localhost", "hardhat"];

      const isLocalEphemeralNetwork = ephemeralNetworkNames.includes(
        hre.network.name
      );

      const shouldRedeploy = "redeploy" in taskArgs && !!taskArgs.redeploy;
      const contract = checkTaskArgsForDeployedContractArgument(taskArgs, hre);

      // Dont set address from env if we are deploying to a local ephemeral network, it must be redeployed. But its probably deterministic and on the same address.
      if (!isLocalEphemeralNetwork) {
        // Dont set address from env if task args contain redeploy flag. Then we want to redeploy.
        if (!shouldRedeploy) {
          log(
            "Used env variable for contract: ",
            contract,
            " on network: ",
            hre.network.name,
            " with address: ",
            process.env[`${contract}_${hre.network.name}`],
            ""
          );
          hre.deployed[contract] =
            process.env[`${contract}_${hre.network.name}`];
        }
      }
    }
  );

subtask(
  TASK_POST_DEPLOY_CHECK,
  "Sets hardhat runtime deployed addresses from env variables"
)
  .addFlag("redeploy", "Redeploy deployment")
  .addParam("contract", "Contract name")
  .addParam("address", "Contract address")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment,
      _: RunSuperFunction<TaskArguments>
    ) => {
      const ephemeralNetworkNames = ["localhost", "hardhat"];

      const isLocalEphemeralNetwork = ephemeralNetworkNames.includes(
        hre.network.name
      );

      const shouldRedeploy = "redeploy" in taskArgs && !!taskArgs.redeploy;

      const address =
        "address" in taskArgs &&
        typeof taskArgs.address === "string" &&
        taskArgs.address.length > 0 &&
        (taskArgs.address as string);

      if (!address) {
        throw new Error("No address provided to post deploy check");
      }

      if (!hre.ethers.utils.getAddress(address)) {
        throw new Error("Invalid address provided to post deploy check");
      }

      const contract = checkTaskArgsForDeployedContractArgument(taskArgs, hre);
      const hasEnvVariable = !!process.env[`${contract}_${hre.network.name}`];

      // update runtime variable
      hre.deployed[contract] = address;

      /* Always update env variable if 
	  - is local ephemeral network 
	  - should redeploy
	  - no env variable set for this [contract + network]
	   */

      if (isLocalEphemeralNetwork || shouldRedeploy || !hasEnvVariable) {
        await updateDotenv({
          [`${contract}_${hre.network.name}`]: address,
        });
        hre.deployed[contract] = address;
        if (!hre.deployed[contract]) {
          throw Error("Failed to set deployed contract address");
        }
      }
    }
  );

task(
  TASK_GENERATE_NPM_PACKAGE,
  "Write deployment and typechain files to npm package"
)
  .addFlag("log", "Log execution")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        if (hre.hardhatArguments.verbose || taskArgs.log) {
          log.enabled = true;
        }

        log("Starting tsup build");

        const tsup = new Promise((resolve, reject) => {
          exec("tsup", (error, stdout, stderr) => {
            if (error) {
              log(`tsup error: ${error}`);
              return reject(error);
            }
            log(stdout);
            log(stderr);
            resolve(true);
          });
        });

        log("Waiting tsup build");
        await tsup;
        log("Finished tsup build");
      } catch (error) {
        log("Error in generate-npm-package task", error);
        console.error(error);
        throw error;
      }
    }
  );

task(TASK_CLEAN, "Clears the cache and deletes all artifacts").setAction(
  async (
    taskArgs: TaskArguments,
    _: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<TaskArguments>
  ) => {
    rmSync(`./${deploymentsFolder}`, { recursive: true, force: true });
    runSuper(taskArgs);
  }
);

function checkTaskArgsForDeployedContractArgument(
  taskArgs: TaskArguments,
  hre: HardhatRuntimeEnvironment
): keyof typeof hre.deployed {
  const contract =
    "contract" in taskArgs &&
    typeof taskArgs.contract === "string" &&
    (taskArgs.contract as keyof typeof hre.deployed);
  if (!contract) {
    throw new Error(
      `Contract name not provided to task ${TASK_POST_DEPLOY_CHECK}`
    );
  }
  // TODO - Implement runtime type check for contract name
  return contract;
}

function updateDotenv(newEnv: Record<string, string>) {
  let contents = "";
  try {
    contents = readFileSync(".env", "utf8");
  } catch (error) {
    throw new Error("No .env file found");
  }
  const lines = contents.split(/\r?\n/);
  // Update
  const updatedLines = lines.map((line) => {
    if (line.includes("#")) return line;
    const [key] = line.split("=");
    if (key in newEnv) {
      const newLine = `${key}="${newEnv[key]}"`;
      delete newEnv[key];
      return newLine;
    }
    return line;
  });
  // insert
  const newLines = Object.entries(newEnv).map(([key, value]) => {
    return `${key}="${value}"`;
  });
  // merge
  const mergedLines = [...updatedLines, ...newLines];
  // write
  writeFileSync(".env", mergedLines.join("\n"));
}
