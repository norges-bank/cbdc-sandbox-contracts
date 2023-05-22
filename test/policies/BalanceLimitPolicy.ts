import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { afterEach } from "mocha";
import {
  BalanceLimitPolicy,
  BalanceLimitPolicy__factory,
  CBToken,
} from "../../typechain-types";
import { setupTestEnvironment, deployPolicies } from "./../test-utils";

let norgesBank: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let dsp: CBToken;
let balanceLimitPolicy: BalanceLimitPolicy;
let snapshot: any;

before(async () => {
  ({ norgesBank, user1, user2, dsp } = await setupTestEnvironment());

  const policyFactories = [
    { Factory: BalanceLimitPolicy__factory, args: [dsp.address] },
  ];

  [balanceLimitPolicy] = await deployPolicies(policyFactories, norgesBank);

  await balanceLimitPolicy.setExempt(norgesBank.address, true);
  await dsp.setDefaultPolicy(balanceLimitPolicy.address);
  await dsp.mint(norgesBank.address, 1_000_000_0000, { gasLimit: 1000000 });
  await dsp.connect(norgesBank).transfer(user1.address, 1_000_0000);

  snapshot = await takeSnapshot();
});

afterEach(async () => {
  await snapshot.restore();
});

describe("BalanceLimitPolicy", () => {
  it("should test that norgesBank is exempt and should not be limited by policies", async () => {
    expect(
      await balanceLimitPolicy.getUserBalanceLimitOf(norgesBank.address)
    ).to.equal(0);
  });

  it("should test that user2 is not exempt and should be limited by policies", async () => {
    await dsp.connect(user1).transfer(user2.address, 1_000_0000);

    expect(
      await balanceLimitPolicy.getUserBalanceLimitOf(user2.address)
    ).to.equal(500_0000);
  });

  it("nothing spescial should happen if transfer amount is below receiver balance limit", async () => {
    await dsp.connect(user1).transfer(user2.address, 300_0000);

    expect(
      await balanceLimitPolicy.getOverflowBalanceOf(user2.address)
    ).to.equal(0);
  });

  it("nothing spescial should happen if transfer amount is equal to receiver balance limit", async () => {
    await dsp.connect(user1).transfer(user2.address, 500_0000);

    expect(
      await balanceLimitPolicy.getOverflowBalanceOf(user2.address)
    ).to.equal(0);
  });

  it("should use overflow if receiver balance is above limit", async () => {
    await dsp.connect(user1).transfer(user2.address, 600_0000);

    expect(
      await balanceLimitPolicy.getOverflowBalanceOf(user2.address)
    ).to.equal(100_0000);

    expect(await dsp.balanceOf(user2.address)).to.equal(500_0000);
  });

  it("should use overflow if receiver balance is above limit and transfer amount is below limit", async () => {
    await dsp.connect(user1).transfer(user2.address, 600_0000);
    await dsp.connect(user1).transfer(user2.address, 300_0000);

    expect(
      await balanceLimitPolicy.getOverflowBalanceOf(user2.address)
    ).to.equal(400_0000);

    expect(await dsp.balanceOf(user2.address)).to.be.closeTo(500_0000, 1_0000);
  });

  it("should use overflow if receiver balance is above limit and transfer amount is equal to limit", async () => {
    await dsp.connect(user1).transfer(user2.address, 600_0000);
    await dsp.connect(user1).transfer(user2.address, 500_0000);

    expect(
      await balanceLimitPolicy.getOverflowBalanceOf(user2.address)
    ).to.equal(600_0000);

    expect(await dsp.balanceOf(user2.address)).to.be.closeTo(500_0000, 1_0000);
  });
});
