import { ethers } from "hardhat";

async function main() {
  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const cBTokenAddress = `${process.env.CB_TOKEN_ADDRESS}`;
  const cBSTokenAddress = `${process.env.CBS_TOKEN_ADDRESS}`;
  const tokenSwap = await TokenSwap.deploy(cBTokenAddress, cBSTokenAddress);

  await tokenSwap.deployed();

  console.log("TokenSwap deployed to:", tokenSwap.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
