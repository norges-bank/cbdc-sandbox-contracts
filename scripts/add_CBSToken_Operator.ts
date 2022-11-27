import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();

  const cbsAddress = `${process.env.CBS_TOKEN_ADDRESS}`;
  const tokenSwapAddress = `${process.env.TOKEN_SWAP_ADDRESS}`;
  const partition = `${process.env.ISSUE_PARTITION}`;

  const cbsContract = await ethers.getContractAt("CBSToken", cbsAddress);

  const addOperator = await cbsContract.authorizeOperatorByPartition(
    partition,
    tokenSwapAddress
  );
  await addOperator.wait();

  console.log(
    "isOperator",
    await cbsContract.isOperatorForPartition(
      partition,
      tokenSwapAddress,
      signer.address
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
