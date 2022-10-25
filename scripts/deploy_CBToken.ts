import { ethers } from "hardhat";

async function main() {
  const cBTokenName = `${process.env.CBTOKEN_NAME}`;
  const cBTokenSymbol = `${process.env.CBTOKEN_SYMBOL}`;
  const CBToken = await ethers.getContractFactory("CBToken");
  const token = await CBToken.deploy(cBTokenName, cBTokenSymbol, 4);

  await token.deployed();

  console.log("Token deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
