import { ethers } from "hardhat";

const getTokenValue = (value: number) =>
  ethers.utils.parseUnits(value.toString(), 4);

async function main() {
  const tokenSwapAddress = `${process.env.TOKEN_SWAP_ADDRESS}`;
  const tokenSwapContract = await ethers.getContractAt(
    "TokenSwap",
    tokenSwapAddress
  );
  const partition = `${process.env.ISSUE_PARTITION}`;
  const operatorData = `${process.env.OPERATOR_DATA}`;
  const value = getTokenValue(50);

  const redeem = await tokenSwapContract.swapCbsToCb(
    partition,
    value,
    operatorData
  );

  await redeem.wait();
  console.log("redeem", redeem);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
