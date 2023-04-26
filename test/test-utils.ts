// test-utils.ts
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { CBToken__factory } from "../typechain-types";

export async function setupTestEnvironment() {
  const allAccounts = await ethers.getSigners();
  const norgesBank = allAccounts[0];
  const bank = allAccounts[1];
  const user1 = allAccounts[2];
  const user2 = allAccounts[3];
  const notAuthorized = allAccounts[4];
  const notAuthorized2 = allAccounts[5];
  const contract1 = allAccounts[6];

  // Deploy ERC20
  const dspFactory = new CBToken__factory(norgesBank);

  const dsp = await dspFactory.deploy("DSP NOK Coin", "DSP", 4, 2023, {
    gasLimit: ethers.BigNumber.from(10_000_000),
  });

  await dsp.deployed();

  return {
    norgesBank,
    bank,
    user1,
    user2,
    notAuthorized,
    notAuthorized2,
    contract1,
    dsp,
  };
}

export async function deployPolicies(
  policyFactories: Array<{ Factory: any; args?: any[] }>,
  deployer: Signer
) {
  const deployedPolicies = [];
  let previousPolicy;

  for (const { Factory, args } of policyFactories) {
    const factory = new Factory(deployer);
    const policy = await factory.deploy(...(args || []));
    await policy.deployed();

    if (previousPolicy) {
      await previousPolicy.setNextPolicy(policy.address);
    }

    deployedPolicies.push(policy);
    previousPolicy = policy;
  }

  return deployedPolicies;
}
