import { takeSnapshot, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { afterEach } from "mocha";
import {
  CBToken,
  WeeklySpendingLimitPolicy,
  WeeklySpendingLimitPolicy__factory,
} from "../../typechain-types";
import { setupTestEnvironment, deployPolicies } from "../test-utils";

let norgesBank: SignerWithAddress;
let user1: SignerWithAddress;
let dsp: CBToken;
let weeklySpendingLimitPolicy: WeeklySpendingLimitPolicy;
let snapshot: any;
const ONE_WEEK = 604800;

before(async () => {
  ({ norgesBank, user1, dsp } = await setupTestEnvironment());

  const policyFactories = [
    { Factory: WeeklySpendingLimitPolicy__factory, args: [] },
  ];

  [weeklySpendingLimitPolicy] = await deployPolicies(
    policyFactories,
    norgesBank
  );

  await dsp.mint(norgesBank.address, 1_000_000_0000, { gasLimit: 1000000 });
  await dsp.setDefaultPolicy(weeklySpendingLimitPolicy.address);
  snapshot = await takeSnapshot();
});

afterEach(async () => {
  await snapshot.restore();
});

describe("WeeklySpendingLimitPolicy", () => {
  it("should stop the transfer if user is over limit", async () => {
    await expect(dsp.transfer(user1.address, 1_001_0000)).to.be.revertedWith(
      "WeeklySpendingLimitPolicy: Transfer would exceed senders weekly spending limit"
    );
  });

  it("should stop the transfer if multiple tx makes it go above the limit", async () => {
    await dsp.transfer(user1.address, 500_0000);
    await dsp.transfer(user1.address, 300_0000);

    await expect(dsp.transfer(user1.address, 300_0000)).to.be.revertedWith(
      "WeeklySpendingLimitPolicy: Transfer would exceed senders weekly spending limit"
    );
  });

  it("should allow transfer if user is under limit", async () => {
    await expect(dsp.transfer(user1.address, 999_0000)).to.not.be.reverted;
  });

  it("should reset the limit after a week", async () => {
    await dsp.transfer(user1.address, 1000_0000);

    await expect(dsp.transfer(user1.address, 1)).to.be.revertedWith(
      "WeeklySpendingLimitPolicy: Transfer would exceed senders weekly spending limit"
    );

    await time.increase(ONE_WEEK);
    await expect(dsp.transfer(user1.address, 1000_0000)).to.not.be.reverted;
  });
});
