/* eslint-disable no-unused-vars */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AnonymousDailySpendingLimitPolicy__factory,
  AnonymousTransactionAmountLimitPolicy__factory,
  AnonymousWeeklySpendingLimitPolicy__factory,
  AuthenticatedPolicy__factory,
  BalanceLimitPolicy__factory,
  CBToken,
  ERC5564Messenger__factory,
  ERC5564Registry__factory,
  Secp256k1Generator__factory,
  WeeklySpendingLimitPolicy__factory,
} from "../typechain-types";

import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import debug from "debug";
import { Wallet } from "ethers";
import { afterEach } from "mocha";
import {
  CURVE,
  getSharedSecret as nobleGetSharedSecret,
  Point,
} from "noble-secp256k1";
import {
  getRecoveryPrivateKey,
  getSharedSecret,
  getStealthAddress,
} from "./stealth-utils";
import { deployPolicies, setupTestEnvironment } from "./test-utils";
const log = debug("dsp:test:stealth");

const ONE_YEAR = 365 * 24 * 60 * 60;

let norgesBank: SignerWithAddress;
let deployer: SignerWithAddress;
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

  deployer = norgesBank;

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

  // Authenticate user
  await authenticatedPolicy.connect(bank).setAuthenticatedPerson(user1.address);
  await authenticatedPolicy.connect(bank).setAuthenticatedPerson(user2.address);

  snapshot = await takeSnapshot();
});

afterEach(async () => {
  await snapshot.restore();
});

describe("EC test", function () {
  it("stealth transfer eth and burn", async function () {
    const aliceWallet = ethers.Wallet.createRandom();
    const fundTx = await deployer.sendTransaction({
      to: aliceWallet.address,
      value: ethers.utils.parseEther("1.0"),
    });
    await fundTx.wait();
    const bobWallet = ethers.Wallet.createRandom();

    // 1. Bob generates his root spending key (m) and stealth meta-address (M).
    const bobSpendWallet = ethers.Wallet.createRandom();
    const bobViewWallet = ethers.Wallet.createRandom();
    const bobMetaAddress = bobSpendWallet.address;
    // 2. Bob adds an ENS record to register M as the stealth meta-address for bob.eth.
    const ENS = {
      "bob.eth": bobSpendWallet._signingKey().publicKey,
    };
    // 3. We assume Alice knows that Bob is bob.eth. Alice looks up his stealth meta-address M on ENS.
    const bobMetaAddressFromENS = ENS["bob.eth"];
    // 4. Alice generates an ephemeral key that only she knows, and that she only uses once (to generate this specific stealth address).
    const aliceEphemeralWallet = ethers.Wallet.createRandom();

    // 5. Alice uses an algorithm that combines her ephemeral key and Bob's meta-address to generate a stealth address. She can now send assets to this address.
    const sharedSecretAlice = nobleGetSharedSecret(
      aliceEphemeralWallet._signingKey().privateKey.slice(2),
      bobMetaAddressFromENS.slice(2),
      false
    );
    log("sharedSecretAlice", sharedSecretAlice);

    // keccak hash shared secret
    const sharedSecretHash = ethers.utils.sha256(
      `0x${sharedSecretAlice.slice(4)}`
    ); // has 04 prefix but not 0x

    const sharedSecretBN = ethers.BigNumber.from(sharedSecretHash);
    const sharedSecretBigInt = sharedSecretBN.toBigInt();

    // const viewTag = sharedSecretAliceHash.slice(0, 20);

    // Calculate P (stealth pubkey bob)
    const P = Point.fromHex(bobMetaAddressFromENS.slice(2)).multiply(
      sharedSecretBigInt
    );

    // Calculate p (stealth address bob)
    const stealthAddress = ethers.utils.computeAddress(`0x${P.toHex()}`);
    log("addressP", stealthAddress);

    const transferTx = await aliceWallet
      .connect(ethers.provider)
      .sendTransaction({
        to: stealthAddress,
        value: ethers.utils.parseEther("0.1"),
      });
    await transferTx.wait();

    // 6. Alice also generates her ephemeral public key, and publishes it to the ephemeral public key registry (this can be done in the same transaction as the first transaction sending assets to this stealth address).
    const ANNOUNCEMENTS = [aliceEphemeralWallet._signingKey().publicKey];
    // 7. For Bob to discover stealth addresses belonging to him, Bob needs to scan the ephemeral public key registry for the entire list of ephemeral public keys published by anyone for any reason since the last time he did the scan.
    const sharedSecretBob = nobleGetSharedSecret(
      bobSpendWallet._signingKey().privateKey.slice(2),
      ANNOUNCEMENTS[0].slice(2),
      false
    );
    expect(sharedSecretAlice).to.equal(sharedSecretBob);

    // Calculate recovery private key
    const privateKeyBigInt =
      (BigInt(bobSpendWallet._signingKey().privateKey) * sharedSecretBigInt) %
      CURVE.n;
    const pk = ethers.utils.hexZeroPad(
      ethers.BigNumber.from(privateKeyBigInt).toHexString(),
      32
    );

    // 8. For each ephemeral public key, Bob attempts to combine it with his root spending key to generate a stealth address, and checks if there are any assets in that address. If there are, Bob computes the spending key for that address and remembers it.
    const recoveryWallet = new ethers.Wallet(pk).connect(ethers.provider);
    const balance = await ethers.provider.getBalance(recoveryWallet.address);
    expect(balance.toString()).to.equal(
      ethers.utils.parseEther("0.1").toString()
    );
    const burnTx = await recoveryWallet.sendTransaction({
      to: ethers.constants.AddressZero,
      value: ethers.utils.parseEther("0.09"),
    });
    await burnTx.wait();
    const balanceAfterBurn = await ethers.provider.getBalance(
      recoveryWallet.address
    );
    expect(
      balanceAfterBurn.lt(ethers.utils.parseEther("0.01")),
      "Balance after burn should be less then 0.01"
    ).to.be.true;
  });

  it("stealth transfer eth and burn with stealth-utils", async function () {
    const aliceWallet = ethers.Wallet.createRandom();
    const fundTx = await deployer.sendTransaction({
      to: aliceWallet.address,
      value: ethers.utils.parseEther("1.0"),
    });
    await fundTx.wait();
    const bobWallet = ethers.Wallet.createRandom();

    // 1. Bob generates his root spending key (m) and stealth meta-address (M).
    const bobSpendWallet = ethers.Wallet.createRandom();
    const bobViewWallet = ethers.Wallet.createRandom();
    const bobMetaAddress = bobSpendWallet.address;
    // 2. Bob adds an ENS record to register M as the stealth meta-address for bob.eth.
    const ENS = {
      "bob.eth": bobSpendWallet._signingKey().publicKey,
    };
    // 3. We assume Alice knows that Bob is bob.eth. Alice looks up his stealth meta-address M on ENS.
    const bobMetaAddressFromENS = ENS["bob.eth"];
    // 4. Alice generates an ephemeral key that only she knows, and that she only uses once (to generate this specific stealth address).
    const aliceEphemeralWallet = ethers.Wallet.createRandom(); // r
    // const ec = new EC("secp256k1");
    // const key = ec.keyFromPrivate(
    //   aliceEphemeralWallet._signingKey().privateKey
    // );

    // 5. Alice uses an algorithm that combines her ephemeral key and Bob's meta-address to generate a stealth address. She can now send assets to this address.
    const sharedSecretBigInt = getSharedSecret(
      aliceEphemeralWallet._signingKey().privateKey.slice(2),
      bobMetaAddressFromENS.slice(2)
    );

    // const viewTag = sharedSecretAliceHash.slice(0, 20);

    // Calculate P (stealth pubkey bob)

    const addressP = getStealthAddress(
      bobMetaAddressFromENS.slice(2),
      sharedSecretBigInt
    );

    const transferTx = await aliceWallet
      .connect(ethers.provider)
      .sendTransaction({
        to: addressP,
        value: ethers.utils.parseEther("0.1"),
      });
    await transferTx.wait();

    // 6. Alice also generates her ephemeral public key, and publishes it to the ephemeral public key registry (this can be done in the same transaction as the first transaction sending assets to this stealth address).
    const ANNOUNCEMENTS = [aliceEphemeralWallet._signingKey().publicKey];
    // 7. For Bob to discover stealth addresses belonging to him, Bob needs to scan the ephemeral public key registry for the entire list of ephemeral public keys published by anyone for any reason since the last time he did the scan.
    const sharedSecretBob = getSharedSecret(
      bobSpendWallet._signingKey().privateKey.slice(2),
      ANNOUNCEMENTS[0].slice(2)
    );
    expect(sharedSecretBigInt).to.equal(sharedSecretBob);

    // Calculate recovery private key
    const pk = getRecoveryPrivateKey(
      bobSpendWallet._signingKey().privateKey,
      sharedSecretBigInt
    );

    // 8. For each ephemeral public key, Bob attempts to combine it with his root spending key to generate a stealth address, and checks if there are any assets in that address. If there are, Bob computes the spending key for that address and remembers it.
    const recoveryWallet = new ethers.Wallet(pk).connect(ethers.provider);
    const balance = await ethers.provider.getBalance(recoveryWallet.address);
    expect(balance.toString()).to.equal(
      ethers.utils.parseEther("0.1").toString()
    );
    const burnTx = await recoveryWallet.sendTransaction({
      to: ethers.constants.AddressZero,
      value: ethers.utils.parseEther("0.09"),
    });
    await burnTx.wait();
    const balanceAfterBurn = await ethers.provider.getBalance(
      recoveryWallet.address
    );
    expect(
      balanceAfterBurn.lt(ethers.utils.parseEther("0.01")),
      "Balance after burn should be less then 0.01"
    ).to.be.true;
  });

  it("stealth transfer eth and burn with on-chain generator and messenger", async function () {
    // Wallets
    const aliceWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    const bobWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    const bobSpendWallet = ethers.Wallet.createRandom().connect(
      ethers.provider
    );
    const bobViewWallet = ethers.Wallet.createRandom().connect(ethers.provider);

    // Funding
    await deployer.sendTransaction({
      to: bobWallet.address,
      value: ethers.utils.parseEther("1"),
    });
    const fundTx = await deployer.sendTransaction({
      to: aliceWallet.address,
      value: ethers.utils.parseEther("1"),
    });
    await fundTx.wait();

    // Contracts

    const registry = await new ERC5564Registry__factory(deployer).deploy();
    await registry.deployed();

    const generator = await new Secp256k1Generator__factory(deployer).deploy(
      registry.address
    );
    await generator.deployed();

    const messenger = await new ERC5564Messenger__factory(deployer).deploy();
    await messenger.deployed();

    // flow

    const registryAsBob = registry.connect(bobWallet);

    expect(
      await registryAsBob.registerKeys(
        generator.address,
        `0x${bobSpendWallet._signingKey().publicKey.slice(4)}`,
        `0x${bobViewWallet._signingKey().publicKey.slice(4)}`
      )
    )
      .to.emit(registryAsBob, "StealthKeyChanged")
      .withArgs([
        bobWallet.address,
        generator.address,
        `0x${bobSpendWallet._signingKey().publicKey.slice(4)}`,
        `0x${bobViewWallet._signingKey().publicKey.slice(4)}`,
      ]);

    const aliceEphemeralWallet = ethers.Wallet.createRandom();
    // sol
    const stealthAddressFromSolidity = await generator.generateStealthAddress(
      bobWallet.address,
      aliceEphemeralWallet._signingKey().privateKey
    );
    log("JS bobSpendingPubKey", bobSpendWallet._signingKey().publicKey);
    log(
      "SOL bobSpendingPubKey",
      (await registry.stealthKeys(bobWallet.address, generator.address))
        .spendingPubKey
    );
    const sharedSecretSol = BigInt(stealthAddressFromSolidity.sharedSecret);
    const stealthAddressFromSol = stealthAddressFromSolidity.stealthAddress;
    // js
    const sharedSecretJs = getSharedSecret(
      aliceEphemeralWallet._signingKey().privateKey.slice(2),
      bobSpendWallet._signingKey().publicKey.slice(2)
    );
    const stealthAddressFromJS = getStealthAddress(
      bobSpendWallet._signingKey().publicKey.slice(2),
      sharedSecretJs
    );
    log(
      "aliceEphemeralWallet pubkey",
      aliceEphemeralWallet._signingKey().publicKey
    );
    log("secret  js", sharedSecretJs);
    log("secret sol", sharedSecretSol);
    log("eq secret", sharedSecretJs === sharedSecretSol);
    log("stealthAddressFromSo", stealthAddressFromSol);
    log("stealthAddressFromJS", stealthAddressFromJS);
    log("eq address", stealthAddressFromSol === stealthAddressFromJS);

    // CHECKS
    const transferTx = await aliceWallet
      .connect(ethers.provider)
      .sendTransaction({
        to: stealthAddressFromSol,
        value: ethers.utils.parseEther("0.1"),
      });
    await transferTx.wait();

    // 6. Alice also generates her ephemeral public key, and publishes it to the ephemeral public key registry (this can be done in the same transaction as the first transaction sending assets to this stealth address).
    const ANNOUNCEMENTS = [aliceEphemeralWallet._signingKey().publicKey];

    console.log(ethers.utils.hexZeroPad(stealthAddressFromSol, 32));
    const annoucmentTx = await messenger.announce(
      `0x${aliceEphemeralWallet._signingKey().publicKey.slice(4)}`,
      ethers.utils.hexZeroPad(stealthAddressFromSol, 32),
      ethers.utils.formatBytes32String("0x")
    );
    await annoucmentTx.wait();
    // 7. For Bob to discover stealth addresses belonging to him, Bob needs to scan the ephemeral public key registry for the entire list of ephemeral public keys published by anyone for any reason since the last time he did the scan.

    expect(sharedSecretSol).to.equal(sharedSecretJs);

    const eventFilter = messenger.filters.Announcement();
    const events = await messenger.queryFilter(eventFilter, 0, "latest");
    let found = false;
    for (const event of events) {
      const stealthAddress = ethers.utils.getAddress(
        ethers.utils.hexStripZeros(event.args.stealthRecipientAndViewTag)
      ); // TODO - With view tag this must be parsed
      console.log("event stealthAddress", stealthAddress);
      const balance = await ethers.provider.getBalance(stealthAddress);
      console.log();
      if (balance.gt(ethers.constants.Zero)) {
        log(
          "Found stealth address with balance",
          stealthAddress,
          balance.toString()
        );
        const sharedSecret = getSharedSecret(
          bobSpendWallet._signingKey().privateKey.slice(2),
          `04${event.args.ephemeralPubKey.slice(2)}`
        );
        log("sharedSecretRecovery", sharedSecret);
        log("sharedSecret eqaul", sharedSecret === sharedSecretSol);
        const pk = getRecoveryPrivateKey(
          bobSpendWallet._signingKey().privateKey,
          sharedSecret
        );
        const wallet = new ethers.Wallet(pk);
        log(
          "Checking if we have wallet for stealth address",
          wallet.address,
          stealthAddress,
          wallet.address === stealthAddress
        );
        if (wallet.address === stealthAddress) {
          log("Found wallet for stealth address");
          const recoveryWallet = wallet.connect(ethers.provider);
          expect(stealthAddressFromSol).to.be.equal(
            recoveryWallet.address,
            "Recovery wallet address should be equal to stealth address "
          );
          const balance = await ethers.provider.getBalance(
            recoveryWallet.address
          );
          expect(balance.toString()).to.equal(
            ethers.utils.parseEther("0.1").toString(),
            "Balance of recovery wallet should be 0.1"
          );
          const burnTx = await recoveryWallet.sendTransaction({
            to: ethers.constants.AddressZero,
            value: ethers.utils.parseEther("0.09"),
          });
          await burnTx.wait();
          const balanceAfterBurn = await ethers.provider.getBalance(
            recoveryWallet.address
          );
          expect(
            balanceAfterBurn.lt(ethers.utils.parseEther("0.01")),
            "Balance after burn should be less then 0.01"
          ).to.be.true;
          log("Found wallet", wallet.address);
          found = true;
        }
      }
    }
    expect(found).to.be.true;
  });
});
