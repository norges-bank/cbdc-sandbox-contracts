import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { AuthenticatedPolicy__factory } from "../typechain-types";
import { TASK_PRE_DEPLOY_CHECK } from "./generate-deployments";

task("whitelist-bank", "Whitelist a bank in VC registry")
  .addParam(
    "bank",
    "Address of bank to whitelist",
    undefined,
    types.string,
    false
  )
  .addParam(
    "bankName",
    "Name of bank to whitelist",
    "SomeBank ASA",
    types.string,
    true
  )
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      console.log(taskArgs);
      const [signer] = await hre.ethers.getSigners();

      await hre.run(TASK_PRE_DEPLOY_CHECK, {
        contract: "authenticatedPolicy",
      });

      const authPolicyAddress = hre.deployed.authenticatedPolicy;

      if (!authPolicyAddress) {
        throw new Error("No authPolicyAddress found on this chain");
      }

      const contract = AuthenticatedPolicy__factory.connect(
        authPolicyAddress,
        signer
      );
      const hasRole = await contract.hasRole(
        hre.ethers.utils.id("BANK_ROLE"),
        taskArgs.bank
      );
      if (hasRole) {
        console.log("Address allready has bank role");
        return;
      }
      const tx = await contract.authenticateBank(
        taskArgs.bank,
        taskArgs.bankName,
        {
          gasPrice: hre.ethers.utils.parseUnits("0.0", "gwei"),
          gasLimit: 399462,
        }
      );
      console.log("TX deployed");
      await tx.wait();
      console.log("TX mined");
      const res = await contract.hasRole(
        hre.ethers.utils.id("BANK_ROLE"),
        taskArgs.bank
      );
      console.log("Does bank now have role:", res ? "yes" : "no");
      if (!res) {
        throw new Error(
          "Transaction mined, but bank was still not whitelisted"
        );
      }
      console.log("Done");
    }
  );
