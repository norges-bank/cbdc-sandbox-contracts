import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import {
  AnonymousDailySpendingLimitPolicy__factory,
  AnonymousTransactionAmountLimitPolicy__factory,
  AnonymousWeeklySpendingLimitPolicy__factory,
  AuthenticatedPolicy,
  AuthenticatedPolicy__factory,
  BalanceLimitPolicy__factory,
  CBToken__factory,
  WeeklySpendingLimitPolicy__factory,
} from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  TASK_POST_DEPLOY_CHECK,
  TASK_PRE_DEPLOY_CHECK,
} from "./generate-deployments";
import debug from "debug";
const log = debug("dsp:tasks:deploy-cb");

task("deploy-cb", "Deploy CB token")
  .addFlag("dev", "Deploy development state.")
  .setAction(
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
      try {
        /* Constants */
        const DECIMALS = 4;
        const YEAR = 2022;

        /* Setup wallets */
        const [deployer] = await hre.ethers.getSigners();

        // Task to check if contract addresses exist in env.
        // Continue with deploy and set env variables if not.
        // Will always redeploy to localhost
        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "cbToken",
        });

        const contractAddress = hre.deployed.cbToken;
        // immediately-invoked-function-expression
        let justDeployed = false;

        const contract = await (async () => {
          // Either deploy or attach to existing contract
          if (!contractAddress) {
            /* Deploy Token */
            const cBTokenName = `${process.env.CBTOKEN_NAME}`;
            const cBTokenSymbol = `${process.env.CBTOKEN_SYMBOL}`;

            const cbToken = await new CBToken__factory(deployer).deploy(
              cBTokenName,
              cBTokenSymbol,
              DECIMALS,
              YEAR
            );

            await cbToken.deployed();

            // Update env variable with deployed address
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "cbToken",
              address: cbToken.address,
            });

            justDeployed = true;
            return cbToken;
          } else {
            return await new CBToken__factory(deployer).attach(contractAddress);
          }
        })();

        log(`CB_TOKEN_ADDRESS=${contract.address}`);

        await hre.run(TASK_PRE_DEPLOY_CHECK, {
          contract: "authenticatedPolicy",
        });

        const authPolicyAddress = hre.deployed.authenticatedPolicy;

        const authContract = await (async () => {
          // Either deploy or attach to existing contract
          if (!authPolicyAddress) {
            const authenticatedPolicy = await new AuthenticatedPolicy__factory(
              deployer
            ).deploy();
            await authenticatedPolicy.deployed();

            // Update env variable with deployed address
            await hre.run(TASK_POST_DEPLOY_CHECK, {
              contract: "authenticatedPolicy",
              address: authenticatedPolicy.address,
            });

            return authenticatedPolicy;
          } else {
            return await new AuthenticatedPolicy__factory(deployer).attach(
              authPolicyAddress
            );
          }
        })();

        /* Setup DEV state */
        if (!taskArgs.dev) {
          return;
        }

        if (justDeployed) {
          // Task to check if contract addresses exist in env.
          // Continue with deploy and set env variables if not.
          // Will always redeploy to localhost

          // Deploy BalanceLimitPolicy contract
          const balanceLimitPolicy = await new BalanceLimitPolicy__factory(
            deployer
          ).deploy(contract.address);
          await balanceLimitPolicy.deployed();
          log("BalanceLimitPolicy deployed to:", balanceLimitPolicy.address);
          await (
            await balanceLimitPolicy.setExempt(deployer.address, true)
          ).wait();
          await (
            await contract.setDefaultPolicy(balanceLimitPolicy.address)
          ).wait();
          log("cbToken.setDefaultPolicy");

          // Deploy WeeklySpendingLimitPolicy contract and set it as next after BalanceLimitPolicy

          const weeklySpendingLimitPolicy =
            await new WeeklySpendingLimitPolicy__factory(deployer).deploy();
          await weeklySpendingLimitPolicy.deployed();
          log(
            "weeklySpendingLimitPolicy deployed to:",
            weeklySpendingLimitPolicy.address
          );
          await (
            await balanceLimitPolicy.setNextPolicy(
              weeklySpendingLimitPolicy.address
            )
          ).wait();
          log("balanceLimitPolicy.setNextPolicy");

          // AuthenticatedPolicy --> AnonymousTransactionAmountLimitPolicy
          const anonymousTransactionAmountLimitPolicyFactory =
            new AnonymousTransactionAmountLimitPolicy__factory(deployer);
          const anonymousTransactionAmountLimitPolicy =
            await anonymousTransactionAmountLimitPolicyFactory.deploy();
          await anonymousTransactionAmountLimitPolicy.deployed();
          await authContract.setNextPolicy(
            anonymousTransactionAmountLimitPolicy.address
          );

          // AnonymousTransactionAmountLimitPolicy --> AnonymousWeeklySpendingLimitPolicy
          const anonymousWeeklySpendingLimitPolicyFactory =
            new AnonymousWeeklySpendingLimitPolicy__factory(deployer);
          const anonymousWeeklySpendingLimitPolicy =
            await anonymousWeeklySpendingLimitPolicyFactory.deploy();
          await anonymousWeeklySpendingLimitPolicy.deployed();
          await anonymousTransactionAmountLimitPolicy.setNextPolicy(
            anonymousWeeklySpendingLimitPolicy.address
          );

          // Deploy AnonymousDailySpendingLimitPolicy contract and set it as next after AnonymousWeeklySpendingLimitPolicy
          const anonymousDailySpendingLimitPolicyFactory =
            new AnonymousDailySpendingLimitPolicy__factory(deployer);
          const anonymousDailySpendingLimitPolicy =
            await anonymousDailySpendingLimitPolicyFactory.deploy();
          await anonymousDailySpendingLimitPolicy.deployed();
          await anonymousWeeklySpendingLimitPolicy.setNextPolicy(
            anonymousDailySpendingLimitPolicy.address
          );

          console.log(`AUTHENTICATED_POLICY_ADDRESS=${authContract.address}`);
          await weeklySpendingLimitPolicy.setNextPolicy(authContract.address);
          await contract.mint(deployer.address, 1_000_000_0000);
          await deployVCTestData(hre, deployer, authContract);

          await contract.transfer(
            process.env.DEV_TENOR_BESKJEDEN!,
            100_000_0000
          );

          await contract.transfer(
            process.env.DEV_TENOR_MINKENDE!,
            400_000_0000
          );

          await contract.transfer(
            process.env.DEV_TENOR_MINKENDE!,
            400_000_0000
          );

          await contract.transfer(
            process.env.DEV_TEST_PERSON_ADDRESS!,
            80_000_0000
          );
        }
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  );

async function deployVCTestData(
  hre: HardhatRuntimeEnvironment,
  deployer: SignerWithAddress,
  auth: AuthenticatedPolicy
) {
  const devWallet = new hre.ethers.Wallet(process.env.DEV_PRIVATE_KEY!).connect(
    hre.ethers.provider
  );
  const vcRegistryAsDEVWallet = auth.connect(devWallet);

  // Make DEPLOYER a bank
  // console.log("Setting up DEPLOYER as a BANK in vcRegistry");
  await (await auth.authenticateBank(deployer.address, "DEV bank")).wait();

  // Make dsp wallet verifier a bank
  await (
    await auth.authenticateBank(
      "0xbeafaC4F6F2C90587B6945FD4c4315AF977D57Df",
      "DSP verifier"
    )
  ).wait();

  // Make a test account also a bank
  // console.log(
  //   `Setting up ${process.env.DEV_TEST_BANK_NAME} with address ${process.env.DEV_TEST_BANK_ADDRESS} as BANK in VC registry`
  // );
  await (
    await auth.authenticateBank(
      process.env.DEV_TEST_BANK_ADDRESS!,
      process.env.DEV_TEST_BANK_NAME!
    )
  ).wait();

  // DEV bank authenticates TEST PERSON
  // DEV must be the bank that sets auth, because we want to test that only it can re-auth later.
  await (
    await vcRegistryAsDEVWallet.setAuthenticatedPerson(
      process.env.DEV_TEST_PERSON_ADDRESS!
    )
  ).wait();
  // TODO REMOVE
  await (
    await vcRegistryAsDEVWallet.setAuthenticatedPerson(
      "0x0a665B1Bc813cAE9fcDd2Eb7E25b8E55A5F35f23"
    )
  ).wait();
  await (
    await vcRegistryAsDEVWallet.setAuthenticatedPerson(
      process.env.DEV_TENOR_BESKJEDEN!
    )
  ).wait();
  await (
    await vcRegistryAsDEVWallet.setAuthenticatedPerson(
      process.env.DEV_TENOR_MINKENDE!
    )
  ).wait();
}
