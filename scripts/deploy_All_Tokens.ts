import { ethers } from "hardhat";

async function main() {
  const cBTokenName = `${process.env.CBTOKEN_NAME}`;
  const cBTokenSymbol = `${process.env.CBTOKEN_SYMBOL}`;
  const cBSTokenName = `${process.env.CBSTOKEN_NAME}`;
  const cBSTokenSymbol = `${process.env.CBSTOKEN_SYMBOL}`;

  // ========DEPLOY CB TOKEN============
  const CBToken = await ethers.getContractFactory("CBToken");
  const cbToken = await CBToken.deploy(cBTokenName, cBTokenSymbol, 4);

  await cbToken.deployed();
  console.log("CBToken deployed to:", cbToken.address);

  // ========DEPLOY CBS TOKEN============
  const cBSToken = await ethers.getContractFactory("CBSToken");
  const controller = `${process.env.CONTROLLER}`;
  const partition1 = `${process.env.PARTITION_1}`;
  const partition2 = `${process.env.PARTITION_2}`;
  const partition3 = `${process.env.PARTITION_3}`;

  const partitions = [partition1, partition2, partition3];

  const cbsToken = await cBSToken.deploy(
    cBSTokenName,
    cBSTokenSymbol,
    4,
    [controller],
    partitions
  );

  await cbsToken.deployed();
  console.log("CBSToken deployed to:", cbsToken.address);

  // ========DEPLOY TOKENSWAP ============
  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const cBTokenAddress = cbToken.address;
  const cBSTokenAddress = cbsToken.address;
  const tokenSwap = await TokenSwap.deploy(cBTokenAddress, cBSTokenAddress);

  await tokenSwap.deployed();
  console.log("TokenSwap deployed to:", tokenSwap.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
