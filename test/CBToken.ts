import { takeSnapshot, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Wallet } from "ethers";
import { ethers } from "hardhat";
import { afterEach } from "mocha";
import {
  AnonymousDailySpendingLimitPolicy__factory,
  AnonymousTransactionAmountLimitPolicy__factory,
  AnonymousWeeklySpendingLimitPolicy__factory,
  AuthenticatedPolicy__factory,
  BalanceLimitPolicy__factory,
  CBToken,
  WeeklySpendingLimitPolicy__factory,
} from "../typechain-types";
import { deployPolicies, setupTestEnvironment } from "./test-utils";

const ONE_YEAR = 365 * 24 * 60 * 60;

let norgesBank: SignerWithAddress;
let bank: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let notAuthorized: SignerWithAddress;
let contract1: SignerWithAddress;
let dsp: CBToken;
let snapshot: any;
let balanceLimitPolicy: any;
let authenticatedPolicy: any;
let weeklySpendingLimitPolicy: any;
let anonymousTransactionAmountLimitPolicy: any;
let anonymousWeeklySpendingLimitPolicy: any;
let anonymousDailySpendingLimitPolicy: any;

before(async () => {
  ({ norgesBank, bank, user1, user2, notAuthorized, contract1, dsp } =
    await setupTestEnvironment());

  // Define policy factories and constructor arguments in the desired order
  const policyFactories = [
    { Factory: BalanceLimitPolicy__factory, args: [dsp.address] },
    { Factory: WeeklySpendingLimitPolicy__factory },
    { Factory: AuthenticatedPolicy__factory },
    { Factory: AnonymousTransactionAmountLimitPolicy__factory },
    { Factory: AnonymousWeeklySpendingLimitPolicy__factory },
    { Factory: AnonymousDailySpendingLimitPolicy__factory },
  ];

  // Deploy policies using the deployPolicies function
  [
    balanceLimitPolicy,
    weeklySpendingLimitPolicy,
    authenticatedPolicy,
    anonymousTransactionAmountLimitPolicy,
    anonymousWeeklySpendingLimitPolicy,
    anonymousDailySpendingLimitPolicy,
  ] = await deployPolicies(policyFactories, norgesBank);

  await balanceLimitPolicy.setExempt(norgesBank.address, true);
  await dsp.setDefaultPolicy(balanceLimitPolicy.address);
  // Authenticate bank
  await authenticatedPolicy.authenticateBank(bank.address, "Test bank ASA");
  // Authenticate users
  await authenticatedPolicy.connect(bank).setAuthenticatedPerson(user1.address);
  await authenticatedPolicy.connect(bank).setAuthenticatedPerson(user2.address);
  snapshot = await takeSnapshot();
});

afterEach(async () => {
  await snapshot.restore();
});

describe("DSP NOK Coin", function () {
  this.beforeEach(async () => {
    await dsp.mint(norgesBank.address, 1_000_000_0000, { gasLimit: 1000000 });
  });

  it("Should allow the CB to transfer as much as it wants", async function () {
    await expect(dsp.transfer(user1.address, 10_000_0000)).to.not.be.reverted;
  });

  it("Should issue new DSP coins", async function () {
    const mintAmount = 2000_0000;

    const norgesBankBalance = await dsp.balanceOf(norgesBank.address);
    await dsp.mint(norgesBank.address, mintAmount);
    const norgesBankBalanceAfter = await dsp.balanceOf(norgesBank.address);

    const delta = norgesBankBalanceAfter.sub(norgesBankBalance).toNumber();
    expect(delta).to.be.closeTo(mintAmount, 1_0000);
  });

  it("Should transfer cash to another user", async function () {
    // Time to ship the cash! 🚢 First from Norges bank to user1
    await expect(await dsp.signer.getAddress()).to.be.equals(
      norgesBank.address
    );
    await dsp.transfer(user1.address, 500_0000);
    await expect(await dsp.balanceOf(user1.address)).to.be.closeTo(
      500_0000,
      1_0000
    );

    await dsp.connect(user1).transfer(user2.address, 300_0000);
    const user2BalanceAfter = await dsp.balanceOf(user2.address);

    expect(user2BalanceAfter).to.be.closeTo(300_0000, 1_0000);
  });

  it("Should burn DSP coins", async function () {
    const burnAmount = 1000_0000;

    const norgesBankBalance = await dsp.balanceOf(norgesBank.address);
    await dsp.burn(norgesBank.address, burnAmount);
    const norgesBankBalanceAfter = await dsp.balanceOf(norgesBank.address);

    const delta = norgesBankBalance.sub(norgesBankBalanceAfter).toNumber();
    expect(delta).to.be.closeTo(burnAmount, 5_0000);
  });

  it("Should stop transfer to 0x0 (i.e. burn) from others than Norges bank", async function () {
    await dsp.transfer(user1.address, 1000_0000);

    await expect(
      dsp.connect(user1).transfer(ethers.constants.AddressZero, 500_0000)
    ).to.be.revertedWith("ERC20: transfer to the zero address");
  });

  it("Should recalculate the compounding interest correctly after 1 and 2 years", async function () {
    // Start amount for user1
    await dsp.transfer(user1.address, 1000_0000);

    // Check balance after 1 year
    await time.increase(ONE_YEAR);
    await dsp.recalculateIndex();
    const newBalance = await dsp.balanceOf(user1.address);
    expect(newBalance).to.be.closeTo(1500_0000, 15_0000);

    // Check balance after another year (2 years total)
    await time.increase(ONE_YEAR);
    await dsp.recalculateIndex();
    const newBalance2 = await dsp.balanceOf(user1.address);
    expect(newBalance2).to.be.closeTo(2250_0000, 23_0000);
  });

  it("Should return the correct (scaled) total supply", async function () {
    let totalSupply = await dsp.totalSupply();
    expect(totalSupply).to.equal(1_000_000_0000);

    await time.increase(ONE_YEAR);
    await dsp.recalculateIndex();

    totalSupply = await dsp.totalSupply();
    expect(totalSupply).to.be.closeTo(1_500_000_0000, 500_0000);
  });

  it("Should have equal total supply as the sum of all balances after a year", async function () {
    // Check balance after 1 year
    await time.increase(ONE_YEAR);
    await dsp.recalculateIndex();

    const totalSupply = await dsp.totalSupply();

    const user1Balance = await dsp.balanceOf(user1.address);
    const user2Balance = await dsp.balanceOf(user2.address);
    const norgesBankBalance = await dsp.balanceOf(norgesBank.address);
    const bankBalance = await dsp.balanceOf(bank.address);
    const notAuthorizedBalance = await dsp.balanceOf(notAuthorized.address);
    const contract1Balance = await dsp.balanceOf(contract1.address);

    const sumOfBalances = user1Balance
      .add(user2Balance)
      .add(norgesBankBalance)
      .add(bankBalance)
      .add(notAuthorizedBalance)
      .add(contract1Balance);

    expect(totalSupply).to.equal(sumOfBalances);
  });

  it("Should return zero interest for a user with no balance", async function () {
    await time.increase(ONE_YEAR);
    await dsp.setYear(2024);
    dsp.calculateEOYInterest(2023);
    await dsp.transfer(user1.address, 1);

    const interest = await dsp.calculateInterestEarned(user2.address, 2023);
    expect(interest).to.equal(0);
  });

  it("Should calculate the interest paid out for a user", async function () {
    await dsp.transfer(user1.address, 1000_0000);

    await time.increase(ONE_YEAR);
    await dsp.setYear(2024);
    dsp.calculateEOYInterest(2023);
    await dsp.transfer(user1.address, 1);

    const interest = await dsp.calculateInterestEarned(user1.address, 2023);
    expect(interest).to.be.closeTo(500_0000, 1_0000);
  });

  it("Should calculate the correct interest for multiple years", async function () {
    await dsp.transfer(user1.address, 1000_0000);

    await time.increase(ONE_YEAR);
    await dsp.setYear(2024);
    await dsp.calculateEOYInterest(2023);
    await dsp.transfer(user1.address, 1);

    await time.increase(ONE_YEAR);
    await dsp.setYear(2025);
    await dsp.calculateEOYInterest(2024);
    await dsp.transfer(user1.address, 1);

    const interest2023 = await dsp.calculateInterestEarned(user1.address, 2023);
    const interest2024 = await dsp.calculateInterestEarned(user1.address, 2024);
    const totalInterest = interest2023.add(interest2024);

    expect(interest2023).to.be.closeTo(500_0000, 1_0000);
    expect(interest2024).to.be.closeTo(750_0000, 1_0000);
    expect(totalInterest).to.be.closeTo(1250_0000, 2_0000);
  });

  it("Should return correct interest when user has received tokens in different years", async function () {
    await dsp.transfer(user1.address, 1000_0000);

    await time.increase(ONE_YEAR);
    await dsp.setYear(2024);
    await dsp.calculateEOYInterest(2023);
    await dsp.transfer(user1.address, 500_0000);

    await time.increase(ONE_YEAR);
    await dsp.setYear(2025);
    await dsp.calculateEOYInterest(2024);
    await dsp.transfer(user1.address, 1);

    const interest2023 = await dsp.calculateInterestEarned(user1.address, 2023);
    const interest2024 = await dsp.calculateInterestEarned(user1.address, 2024);
    const totalInterest = interest2023.add(interest2024);

    expect(interest2023).to.be.closeTo(500_0000, 1_0000);
    expect(interest2024).to.be.closeTo(1_000_0000, 1_0000);
    expect(totalInterest).to.be.closeTo(1_500_0000, 2_0000);
  });

  it("Should return zero interest for years before user had a balance", async function () {
    await time.increase(ONE_YEAR);
    await dsp.recalculateIndex();

    await dsp.transfer(user1.address, 1000_0000);
    await time.increase(ONE_YEAR);
    await dsp.recalculateIndex();

    const interest = await dsp.calculateInterestEarned(user1.address, 2022);
    expect(interest).to.equal(0);
  });

  it("Should change the interest after 6 months and return correct interest after a year", async function () {
    await dsp.transfer(user1.address, 1000_0000);

    await time.increase(ONE_YEAR / 2);

    await dsp.recalculateIndex();
    const interestQ2 = await dsp.calculateInterestEarned(user1.address, 2023);
    expect(interestQ2).to.be.closeTo(250_0000, 1_0000);
    const balanceQ2 = await dsp.balanceOf(user1.address);
    expect(balanceQ2).to.be.closeTo(1250_0000, 1_0000);

    const tenToThe25 = ethers.BigNumber.from(10).pow(26);
    await dsp.setInterestRate(tenToThe25, false);

    await time.increase(ONE_YEAR / 2);
    await dsp.setYear(2024);
    await dsp.calculateEOYInterest(2023);
    await dsp.transfer(user1.address, 1);

    const interestQ4 = await dsp.calculateInterestEarned(user1.address, 2023);
    expect(interestQ4).to.be.closeTo(312_5000, 1_0000);
    const balanceQ4 = await dsp.balanceOf(user1.address);
    expect(balanceQ4).to.be.closeTo(1_312_5000, 1_0000);
  });
});
