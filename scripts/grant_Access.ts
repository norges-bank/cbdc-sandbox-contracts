import { ethers } from "hardhat";

async function main() {
  const contractAddress = `${process.env.CONTRACT_ADDRESS}`;
  const actorAddress = `${process.env.ACTOR_ADDRESS}`;

  const contract = await ethers.getContractAt("AccessControl", contractAddress);
  const roles = `${process.env.ROLES}`.split(",");
  for (const role of roles) {
    const grantRole = await contract.grantRole(role, actorAddress);
    await grantRole.wait();
    console.log(
      `${actorAddress} has ${role} role:`,
      await contract.hasRole(role, actorAddress)
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
