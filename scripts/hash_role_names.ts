import { ethers } from "hardhat";

async function main() {
  const roles = `${process.env.ROLES}`.split(",");
  const hashes = roles.map((role) =>
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(role))
  );
  console.log(hashes.join(","));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
