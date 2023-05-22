import { ethers } from "hardhat";

async function main() {
  const CBTAddress = `${process.env.CB_TOKEN_ADDRESS}`;

  const dsp = await ethers.getContractAt("CBToken", CBTAddress);

  // set interest rate to 50%
  const num50percent = ethers.BigNumber.from(50).mul(
    ethers.BigNumber.from(10).pow(25)
  );
  await dsp.setInterestRate(num50percent, false);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
