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
  let address1: SignerWithAddress;

  before(async () => {
    [owner, address1] = await ethers.getSigners();

    const CBToken = await ethers.getContractFactory("CBToken");
    token = await CBToken.deploy(NAME, SYMBOL, DECIMALS);

    await token.deployed();
  });

  it("Should return the correct number of decimals", async () => {
    expect(await token.decimals()).to.equal(DECIMALS);
  });

  it("Should return the correct total supply", async () => {
    expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
  });

  it("Should allow the owner to mint more tokens", async () => {
    expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_TOTAL_SUPPLY);
    expect(await token.balanceOf(address1.address)).to.equal(0);

    await token.mint(address1.address, MINTED_TOKENS);

    expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_TOTAL_SUPPLY);
    expect(await token.balanceOf(address1.address)).to.equal(MINTED_TOKENS);
  });
});
