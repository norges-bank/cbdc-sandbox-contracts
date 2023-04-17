// TODO VCRegistry has been deleted
// import { task, types } from "hardhat/config";
// import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
// import { VCRegistry__factory } from "../typechain-types/factories/contracts/VCRegistry__factory";

// task("whitelist-status", "Get whitelist status of an address")
//   .addPositionalParam(
//     "address",
//     "Address to check who bank is current service provider",
//     undefined,
//     types.string,
//     false
//   )
//   .addParam(
//     "vcRegistry",
//     "Address to VC registry",
//     undefined,
//     types.string,
//     false
//   )
//   .setAction(
//     async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
//       try {
//         console.log(taskArgs);
//         const ONE_YEAR = 52 * 7 * 24 * 60 * 60;
//         const [signer] = await hre.ethers.getSigners();
//         console.log(`Whitelist status for ${taskArgs.address}`);
//         const vcRegistryAddress: string | undefined =
//           taskArgs.vcRegistry || process.env.VC_REGISTRY_ADDRESS;
//         if (!vcRegistryAddress) {
//           throw new Error("VC registry address not set");
//         }

//         const vcRegistry = VCRegistry__factory.connect(
//           taskArgs.vcRegistry,
//           signer
//         );
//         const isAuthenticated = await vcRegistry.checkAuthenticatedOnce(
//           taskArgs.address
//         );
//         const isAuthenticatedSend = await vcRegistry.checkAuthenticated(
//           taskArgs.address,
//           ONE_YEAR
//         );
//         const bankAddress = await vcRegistry.getBankOf(taskArgs.address);
//         const bankName = await vcRegistry.getBankName(bankAddress);
//         console.log(`Is authenticated receive = ${isAuthenticated}`);
//         console.log(`Is authenticated send = ${isAuthenticatedSend}`);
//         console.log(`Bank name = ${bankName}`);
//         console.log(`Bank address =${bankAddress}`);
//         console.log("Done");
//       } catch (error) {
//         console.error(error);
//         throw error;
//       }
//     }
//   );
