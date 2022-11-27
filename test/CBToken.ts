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

  const DEFAULT_ADMIN_ROLE =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");
  const BURNER_ROLE = ethers.utils.id("BURNER_ROLE");
  const ROLE = ethers.utils.id("ROLE");

  let token: Contract;
  let admin: SignerWithAddress;
  let accountOne: SignerWithAddress;

  before(async () => {
    [admin, accountOne] = await ethers.getSigners();

    const CBToken = await ethers.getContractFactory("CBToken");
    token = await CBToken.deploy(NAME, SYMBOL, DECIMALS);

    await token.deployed();
  });

  describe("Deployment", async () => {
    it("should set the correct admin", async () => {
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(
        true
      );
      expect(
        await token.hasRole(DEFAULT_ADMIN_ROLE, accountOne.address)
      ).to.equal(false);
    });

    it("should return the correct number of decimals", async () => {
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("should return the correct total supply", async () => {
      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
    });
  });

  describe("#mint()", async () => {
    it("should allow accounts with the minter role to mint tokens", async () => {
      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
      expect(await token.balanceOf(admin.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(0);

      expect(await token.hasRole(MINTER_ROLE, admin.address)).to.equal(true);

      await token.mint(accountOne.address, MINTED_TOKENS);

      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
      expect(await token.balanceOf(admin.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(MINTED_TOKENS);
    });

    it("should not allow other addresses to mint more tokens", async () => {
      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);

      expect(await token.hasRole(MINTER_ROLE, accountOne.address)).to.equal(
        false
      );

      await expect(
        token.connect(accountOne).mint(accountOne.address, MINTED_TOKENS)
      ).to.be.revertedWith("AccessControl");

      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
    });
  });

  describe("#burn()", async () => {
    it("should allow accounts with the burner role to burn tokens", async () => {
      expect(await token.totalSupply()).to.equal(TOKENS_AFTER_MINT);
      expect(await token.balanceOf(admin.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(MINTED_TOKENS);

      expect(await token.hasRole(BURNER_ROLE, admin.address)).to.equal(true);

      await token.burn(accountOne.address, MINTED_TOKENS);

      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
      expect(await token.balanceOf(admin.address)).to.equal(
        INITIAL_TOTAL_SUPPLY
      );
      expect(await token.balanceOf(accountOne.address)).to.equal(0);
    });

    it("should not allow others to burn tokens", async () => {
      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);

      expect(await token.hasRole(BURNER_ROLE, accountOne.address)).to.equal(
        false
      );

      await expect(
        token.connect(accountOne).burn(admin.address, MINTED_TOKENS)
      ).to.be.revertedWith("AccessControl");
      await expect(
        token.connect(accountOne).burn(accountOne.address, MINTED_TOKENS)
      ).to.be.revertedWith("AccessControl");

      expect(await token.totalSupply()).to.equal(INITIAL_TOTAL_SUPPLY);
    });
  });

  describe("RBAC", async () => {
    afterEach(async () => {
      await token.connect(admin).revokeRole(ROLE, admin.address);
      await token.connect(admin).revokeRole(ROLE, accountOne.address);
    });

    it("should give the deployer the default admin role", async () => {
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(
        true
      );
    });

    it("should allow admins to grant roles", async () => {
      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(false);
      await token.connect(admin).grantRole(ROLE, accountOne.address);
      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(true);
    });

    it("should not allow non-admins to grant roles", async () => {
      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(false);
      await expect(
        token.connect(accountOne).grantRole(ROLE, accountOne.address)
      ).to.be.revertedWith("AccessControl");
      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(false);
    });

    it("should allow admin to revoke roles", async () => {
      await token.connect(admin).grantRole(ROLE, accountOne.address);

      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(true);
      await token.connect(admin).revokeRole(ROLE, accountOne.address);
      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(false);
    });

    it("should not allow non-admins to revoke roles", async () => {
      await token.connect(admin).grantRole(ROLE, accountOne.address);

      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(true);
      await expect(
        token.connect(accountOne).revokeRole(ROLE, accountOne.address)
      ).to.be.revertedWith("AccessControl");
      expect(await token.hasRole(ROLE, accountOne.address)).to.equal(true);
    });
  });
});
