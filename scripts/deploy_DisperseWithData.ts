import { ethers } from "hardhat";

async function main() {
  const Disperse = await ethers.getContractFactory("DisperseWithData");
  const disperse = await Disperse.deploy();

  await disperse.deployed();

  console.log("DisperseWithData deployed to:", disperse.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
