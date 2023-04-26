/* eslint-disable no-unused-vars */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { TestEC__factory } from "../typechain-types";

import { hexlify } from "ethers/lib/utils";

let deployer: SignerWithAddress;
let bank: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;

beforeEach(async () => {
  const allAccounts = await ethers.getSigners();
  deployer = allAccounts[0];
  bank = allAccounts[1];
  user1 = allAccounts[2];
  user2 = allAccounts[3];

  // deploy stealth contract
  const contract = await new TestEC__factory(deployer).deploy();
  await contract.deployed();
});

/* Just for testing some Eliptic curve formatting */
describe("EC test", function () {
  it("Test Pub Key", async function () {
    const bobWallet = ethers.Wallet.createRandom();
    const pubKeyHex = bobWallet._signingKey().publicKey;
    const pubKeyWithoutPrefix = pubKeyHex.slice(4);
    const privKey = bobWallet._signingKey().privateKey;
    const pubX = pubKeyWithoutPrefix.slice(0, pubKeyWithoutPrefix.length / 2);
    const pubY = pubKeyWithoutPrefix.slice(pubKeyWithoutPrefix.length / 2);

    const contract = await new TestEC__factory(deployer).deploy();
    await contract.deployed();

    const [xFromSolidity, yFromSolidty] = await contract.getPubKey(privKey);

    expect(hexlify(xFromSolidity).slice(2)).equals(pubX);
    expect(hexlify(yFromSolidty).slice(2)).equals(pubY);

    const [x, y] = await contract.bytesToXY(`0x${pubKeyWithoutPrefix}`);

    expect(hexlify(x).slice(2)).equals(pubX);
    expect(hexlify(y).slice(2)).equals(pubY);
  });
});
