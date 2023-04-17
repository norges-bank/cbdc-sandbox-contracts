import { takeSnapshot, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { afterEach } from "mocha";
import {
  AnonymousDailySpendingLimitPolicy__factory,
  AnonymousTransactionAmountLimitPolicy,
  AnonymousTransactionAmountLimitPolicy__factory,
  AnonymousWeeklySpendingLimitPolicy__factory,
  CBToken,
} from "../../typechain-types";
import { deployPolicies, setupTestEnvironment } from "../test-utils";

let norgesBank: SignerWithAddress;
let notAuthorized: SignerWithAddress;
let notAuthorized2: SignerWithAddress;
let dsp: CBToken;
let snapshot: any;
let anonymousTransactionAmountLimitPolicy: AnonymousTransactionAmountLimitPolicy;

const ONE_DAY = 86400;

before(async () => {
  ({ norgesBank, notAuthorized, notAuthorized2, dsp } =
    await setupTestEnvironment());

  const policyFactories = [
    { Factory: AnonymousTransactionAmountLimitPolicy__factory },
    { Factory: AnonymousWeeklySpendingLimitPolicy__factory },
    { Factory: AnonymousDailySpendingLimitPolicy__factory },
  ];
  [anonymousTransactionAmountLimitPolicy] = await deployPolicies(
    policyFactories,
    norgesBank
  );

  await dsp.mint(norgesBank.address, 1_000_000_0000, { gasLimit: 1000000 });
  await dsp.setDefaultPolicy(anonymousTransactionAmountLimitPolicy.address);

  snapshot = await takeSnapshot();
});

afterEach(async () => {
  await snapshot.restore();
});

describe("Anonymous transactions", function () {
  it("Should allow anonymous transactions when under 10 NOK", async function () {
    await expect(transferToNotAuthorized(1)).to.not.be.reverted;
  });

  it("Should not allow anonymous transactions when over 10 NOK", async function () {
    await expect(
      dsp.transfer(notAuthorized.address, 11_0000)
    ).to.be.revertedWith(
      "AnonymousTransactionAmountLimitPolicy: Amount must be less than TRANSACTION AMOUNT LIMIT"
    );
  });

  it("Should allow anonymous transactions for up to 100 NOK daily", async function () {
    await transferToNotAuthorized(9);
    // expect the 10th transfer to be allowed
    await expect(transferToNotAuthorized(1)).to.not.be.reverted;
  });

  it("Should not allow anonymous transactions for over 100 NOK daily", async function () {
    await transferToNotAuthorized(10);
    // expect the 11th transfer should be reverted
    await expect(transferToNotAuthorized(1)).to.be.revertedWith(
      "AnonymousDailySpendingLimitPolicy: Transfer would exceed senders daily anonymous spending limit"
    );
  });

  it("Should allow anonymous transactions for up to 200 NOK weekly", async function () {
    await transferToNotAuthorized(9);
    await time.increase(ONE_DAY);
    await transferToNotAuthorized(9);
    await time.increase(ONE_DAY);
    await transferToNotAuthorized(1);
    // expect the 20th transfer to be allowed
    await expect(transferToNotAuthorized(1)).to.not.be.reverted;
  });

  it("Should not allow anonymous transactions for over 200 NOK weekly", async function () {
    await transferToNotAuthorized(9);
    await time.increase(ONE_DAY);
    await transferToNotAuthorized(9);
    await time.increase(ONE_DAY);
    await transferToNotAuthorized(2);
    // expect the 21th transfer should be reverted
    await expect(transferToNotAuthorized(1)).to.be.revertedWith(
      "AnonymousWeeklySpendingLimitPolicy: Transfer would exceed senders weekly anonymous spending limit"
    );
  });

  it("Should allow stealth addresses to send anonymous transactions ", async function () {
    await dsp.transfer(notAuthorized.address, 9_0000);

    await expect(
      dsp.connect(notAuthorized).transfer(notAuthorized2.address, 5_0000)
    ).to.not.be.reverted;
  });
});

async function transferToNotAuthorized(loops: number) {
  for (let i = 0; i < loops; i++) {
    await dsp.transfer(notAuthorized.address, 9_9999);
  }
}
