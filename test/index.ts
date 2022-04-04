import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

describe("CBToken", function () {
  const NAME = "Bergen";
  const SYMBOL = "BRG";
  const DECIMALS = 6;
  const TOTAL_SUPPLY_DECIMAL = "0".repeat(DECIMALS);
  const INITIAL_TOTAL_SUPPLY = BigNumber.from(
    "1000000".concat(TOTAL_SUPPLY_DECIMAL)
  );
  const MINTED_TOKENS = BigNumber.from("5".concat(TOTAL_SUPPLY_DECIMAL));
  const TOKENS_AFTER_MINT = BigNumber.from(
    "1000005".concat(TOTAL_SUPPLY_DECIMAL)
  );

  let token: Contract;
  let owner: SignerWithAddress;
  let accountOne: SignerWithAddress;

  before(async () => {
    [owner, accountOne] = await ethers.getSigners();

    const CBToken = await ethers.getContractFactory("CBToken");
    token = await CBToken.deploy(NAME, SYMBOL, DECIMALS);

    await token.deployed();
  });

  describe("Deployment", async () => {
    it("Should set the correct owner", async () => {
      expect(await token.owner()).to.equal(owner.address);
      expect(await token.owner()).to.not.equal(accountOne.address);
    });

    it("Should return the correct number of decimals", async () => {
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("Should return the correct total supply", async () => {
      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
    });
  });

  describe("Minting", async () => {
    it("Should allow the owner to mint more tokens", async () => {
      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
      expect(await token.balanceOf(owner.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(0);

      await token.mint(accountOne.address, MINTED_TOKENS);

      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
      expect(await token.balanceOf(owner.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(MINTED_TOKENS);
    });

    it("Should not allow other addresses to mint more tokens", async () => {
      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
      await expect(
        token.connect(accountOne).mint(accountOne.address, MINTED_TOKENS)
      ).to.be.reverted;
      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
    });
  });

  describe("Burning", async () => {
    it("Should allow the owner to burn tokens", async () => {
      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
      expect(await token.balanceOf(owner.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(MINTED_TOKENS);

      await token.burn(accountOne.address, MINTED_TOKENS);

      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
      expect(await token.balanceOf(owner.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(0);
    });
  });
});
