import { ethers } from "hardhat";

const getTokenValue = (value: number) =>
  ethers.utils.parseUnits(value.toString(), 4);

async function main() {
  const signer = (await ethers.getSigners())[0];
  const CBTAddress = `${process.env.CB_TOKEN_ADDRESS}`;
  const tokenSwapAddress = `${process.env.TOKEN_SWAP_ADDRESS}`;
  const partition = `${process.env.ISSUE_PARTITION}`;
  const zeroBytes = `${process.env.ZERO_BYTES32}`;
  const value = getTokenValue(50);

  const tokenSwapContract = await ethers.getContractAt(
    "TokenSwap",
    tokenSwapAddress
  );

  const cBTokenContract = await ethers.getContractAt("CBToken", CBTAddress);

  const approve = await cBTokenContract.approve(tokenSwapAddress, value);

  await approve.wait();
  console.log(
    "Approved ",
    value,
    "for",
    tokenSwapAddress,
    "on",
    cBTokenContract.address
  );
  console.log(
    tokenSwapAddress,
    "allowance for",
    signer.address,
    "on",
    cBTokenContract.address,
    ": ",
    await cBTokenContract.allowance(signer.address, tokenSwapAddress)
  );

  const swap = await tokenSwapContract.swapCbToCbs(partition, value, zeroBytes);

  await swap.wait();
  console.log("swap", swap);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
