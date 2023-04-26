import { takeSnapshot, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { afterEach } from "mocha";
import {
  AuthenticatedPolicy,
  AuthenticatedPolicy__factory,
  CBToken,
} from "../../typechain-types";
import { setupTestEnvironment, deployPolicies } from "../test-utils";

let norgesBank: SignerWithAddress;
let bank: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let notAuthorized: SignerWithAddress;
let contract1: SignerWithAddress;
let dsp: CBToken;
let authenticatedPolicy: AuthenticatedPolicy;
let snapshot: any;

const ONE_YEAR = 31536000;
const ONE_DAY = 86400;

before(async () => {
  ({ norgesBank, bank, user1, user2, notAuthorized, contract1, dsp } =
    await setupTestEnvironment());

  const policyFactories = [{ Factory: AuthenticatedPolicy__factory, args: [] }];
  [authenticatedPolicy] = await deployPolicies(policyFactories, norgesBank);
  await dsp.setDefaultPolicy(authenticatedPolicy.address);

  await authenticatedPolicy.authenticateBank(bank.address, "Test bank ASA");
  await authenticatedPolicy.connect(bank).setAuthenticatedPerson(user1.address);
  await authenticatedPolicy.connect(bank).setAuthenticatedPerson(user2.address);
  await dsp.mint(norgesBank.address, 1_000_000_0000, { gasLimit: 1000000 });
  await dsp.connect(norgesBank).transfer(user1.address, 1_000_0000);

  snapshot = await takeSnapshot();
});

afterEach(async () => {
  await snapshot.restore();
});

describe("AuthenticatedPolicy", () => {
  it("should allow transfer if users are authenticated", async () => {
    await expect(dsp.connect(user1).transfer(user2.address, 1_0000)).to.not.be
      .reverted;
  });

  it("should stop the transfer if receiver is not authenticated", async () => {
    await expect(
      dsp.connect(user1).transfer(notAuthorized.address, 1_0000)
    ).to.be.revertedWith(
      "AuthenticatedPolicy: Sender and/or recipient not authenticated"
    );
  });

  it("should stop the transfer if contract is not authenticated", async () => {
    await expect(
      dsp.connect(user1).transfer(contract1.address, 1_0000)
    ).to.be.revertedWith(
      "AuthenticatedPolicy: Sender and/or recipient not authenticated"
    );
  });

  it("should stop the transfer if sender is not authenticated", async () => {
    await authenticatedPolicy
      .connect(bank)
      .revokeAuthenticationPerson(user1.address);

    await expect(
      dsp.connect(user1).transfer(user2.address, 1_0000)
    ).to.be.revertedWith(
      "AuthenticatedPolicy: Sender and/or recipient not authenticated"
    );
  });

  it("Should stop tranfer if sender authentication times out", async function () {
    await time.increase(ONE_YEAR + ONE_DAY);

    await authenticatedPolicy
      .connect(bank)
      .setAuthenticatedPerson(user2.address);

    await expect(
      dsp.connect(user1).transfer(user2.address, 1_0000)
    ).to.be.revertedWith(
      "AuthenticatedPolicy: Sender and/or recipient not authenticated"
    );
  });

  it("Should allow tranfer even if receiver authentication times out", async function () {
    await time.increase(ONE_YEAR + ONE_DAY);

    await authenticatedPolicy
      .connect(bank)
      .setAuthenticatedPerson(user1.address);

    await expect(dsp.connect(user1).transfer(user2.address, 1_0000)).to.not.be
      .reverted;
  });
});

describe("AuthenticatedPolicy with contracts", () => {
  beforeEach(async () => {
    await authenticatedPolicy
      .connect(user1)
      .setAuthenticatedContract(contract1.address);

    await dsp.connect(user1).transfer(contract1.address, 1_0000);
  });

  it("Should allow transfer if sender is authenticated contract", async () => {
    await expect(dsp.connect(contract1).transfer(user2.address, 1_0000)).to.not
      .be.reverted;
  });

  it("Should stop the transfer from the contract if person who authenticated is revoked", async function () {
    // Revoke! ⛔
    await authenticatedPolicy
      .connect(bank)
      .revokeAuthenticationPerson(user1.address);

    await expect(
      dsp.connect(contract1).transfer(user2.address, 1_0000)
    ).to.be.revertedWith(
      "AuthenticatedPolicy: Sender and/or recipient not authenticated"
    );
  });

  it("Should stop the transfer from the contract if contract is revoked", async function () {
    // Revoke! ⛔
    await authenticatedPolicy
      .connect(bank)
      .revokeAuthenticationContract(contract1.address);

    await expect(
      dsp.connect(contract1).transfer(user2.address, 1_0000)
    ).to.be.revertedWith(
      "AuthenticatedPolicy: Sender and/or recipient not authenticated"
    );
  });
});
