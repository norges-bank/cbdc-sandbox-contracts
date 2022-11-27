import Debug from "debug";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const debug = Debug("test:TokenSwap");

const PARTITION_1 =
  "0x7265736572766564000000000000000000000000000000000000000000000000"; // "reserved" in hex
const PARTITION_2 =
  "0x6973737565640000000000000000000000000000000000000000000000000000"; // "issued" in hex
const PARTITION_3 =
  "0x6c6f636b65640000000000000000000000000000000000000000000000000000"; // "locked" in hex
const defaultPartitions = [PARTITION_1, PARTITION_2, PARTITION_3];

const DECIMALS = 4;

const SWAP_CB_TO_CBS_ROLE = ethers.utils.id("SWAP_CB_TO_CBS_ROLE");
const SWAP_CBS_TO_CB_ROLE = ethers.utils.id("SWAP_CBS_TO_CB_ROLE");

describe("TokenSwap", function () {
  let admin: SignerWithAddress;
  let accountOne: SignerWithAddress;
  let CBToken: any;
  let cbToken: any;
  let cbsToken: any;
  let CBSToken: any;
  let TokenSwap: any;
  let tokenSwap: any;

  const value = ethers.utils.parseUnits("10", DECIMALS);
  let cbTokenTotalSupply: any;

  before(async () => {
    [admin, accountOne] = await ethers.getSigners();
    CBToken = await ethers.getContractFactory("CBToken");
    CBSToken = await ethers.getContractFactory("CBSToken");
    TokenSwap = await ethers.getContractFactory("TokenSwap");

    cbToken = await CBToken.deploy("CBToken", "CBT", DECIMALS);
    await cbToken.deployed();

    const { chainId } = await ethers.provider.getNetwork();

    cbsToken = await CBSToken.deploy(
      "CBSToken",
      "CBST",
      DECIMALS,
      [admin.address],
      defaultPartitions,
      chainId
    );
    await cbsToken.deployed();

    cbTokenTotalSupply = await cbToken.totalSupply();
    debug(
      "CB token total supply",
      ethers.utils.formatUnits(cbTokenTotalSupply, DECIMALS)
    );
    expect(await cbToken.balanceOf(admin.address)).to.equal(cbTokenTotalSupply);

    const cbsTokenTotalSupply = await cbsToken.totalSupply();
    debug(
      "CBS token total supply",
      ethers.utils.formatUnits(cbsTokenTotalSupply, DECIMALS)
    );
    expect(cbsTokenTotalSupply).to.equal(ethers.constants.Zero);
    expect(await cbsToken.balanceOf(admin.address)).to.equal(
      ethers.constants.Zero
    );
  });

  it("should deploy TokenSwap contract", async () => {
    tokenSwap = await TokenSwap.deploy(cbToken.address, cbsToken.address);
    await tokenSwap.deployed();
  });

  it("should approve TokenSwap contract to spend an amount of CBToken", async () => {
    await cbToken.approve(tokenSwap.address, value);
  });

  it("should grant TokenSwap contract a minter role to mint/issue CBSToken", async () => {
    await cbsToken.addMinter(tokenSwap.address);
  });

  it("should set TokenSwap contract as controller of CBSToken", async () => {
    await cbsToken.authorizeOperatorByPartition(PARTITION_2, tokenSwap.address);
  });

  describe("#swapCbToCbs()", () => {
    it("should allow accounts with the SWAP_CB_TO_CBS_ROLE to swap from CB to CBS", async () => {
      expect(
        await tokenSwap.hasRole(SWAP_CB_TO_CBS_ROLE, admin.address)
      ).to.equal(true);

      await tokenSwap.swapCbToCbs(
        PARTITION_2,
        value,
        ethers.constants.HashZero
      );

      expect(await cbToken.balanceOf(admin.address)).to.equal(
        cbTokenTotalSupply.sub(value)
      );
      expect(await cbToken.balanceOf(tokenSwap.address)).to.equal(value);
      expect(await cbsToken.balanceOf(admin.address)).to.equal(value);
    });

    it("should not allow other accounts to swap from CB to CBS", async () => {
      expect(
        await tokenSwap.hasRole(SWAP_CB_TO_CBS_ROLE, accountOne.address)
      ).to.equal(false);

      await expect(
        tokenSwap
          .connect(accountOne)
          .swapCbToCbs(PARTITION_2, value, ethers.constants.HashZero)
      ).to.be.revertedWith("AccessControl");
    });
  });

  describe("#swapCbsToCb()", () => {
    it("should allow accounts with the SWAP_CBS_TO_CB_ROLE to swap from CBS to CB", async () => {
      expect(
        await tokenSwap.hasRole(SWAP_CBS_TO_CB_ROLE, admin.address)
      ).to.equal(true);

      await tokenSwap.swapCbsToCb(
        PARTITION_2,
        value,
        ethers.constants.HashZero
      );

      expect(await cbToken.balanceOf(admin.address)).to.equal(
        cbTokenTotalSupply
      );
      expect(await cbToken.balanceOf(tokenSwap.address)).to.equal(
        ethers.constants.Zero
      );
      expect(await cbsToken.balanceOf(admin.address)).to.equal(
        ethers.constants.Zero
      );
    });

    it("should not allow other accounts to swap from CBS to CB", async () => {
      expect(
        await tokenSwap.hasRole(SWAP_CBS_TO_CB_ROLE, accountOne.address)
      ).to.equal(false);

      await expect(
        tokenSwap
          .connect(accountOne)
          .swapCbsToCb(PARTITION_2, value, ethers.constants.HashZero)
      ).to.be.revertedWith("AccessControl");
    });
  });
});
