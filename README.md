# Smart contracts for the Norges Bank CBDC sandbox

## Disclaimer

This a sandbox project and not intended for production; use at your own risk.

## Running locally

### Installation

The repository may be cloned locally and installation triggered as follows.

```shell
git clone git@github.com:norges-bank/cbdc-sandbox-contracts.git
cd cbdc-sandbox-contracts
npm install
```

### Compilation

The smart contract code base may be compiled with

```shell
npx hardhat compile
```

### Testing

In order to take the smart contracts for a test drive you may invoke

```shell
npx hardhat test --parallel
```

### Environment

To configure environment variables, create a copy of the .env.example file and rename it to .env. You can obtain recommended values from a fellow project member, or input them yourself:

`cp .env.example .env`

#### Development

To run development environment with hardhat `Cmd + Shift + P` and select `Tasks: Run Task` and select `dev`.

#### Build NPM package

To release NPM package, do

- `Cmd + Shift + P`,
- select `Tasks: Run Task` and
- select `release`

:warning: **Send updated .env vars to other deployers**. It is important to ensure that all deployers of this project have the latest version of the `.env` variables. This is because the release updates the addresses to the contracts and it is crucial that everyone has the same information. Please share the contents of the `.env` file with other deployers through chat or any other preferred method of communication. This will help ensure that everyone is working with the most up-to-date information and that the deployment process runs smoothly.

Alternatively, you can use terminal:

NPM package is used to distribute the smart contract types and contract address instances to other projects e.g. dsp-wallet.

In order to build a NPM package for the smart contracts you may invoke

```shell
npx hardhat generate-npm-package
```

This is automatically invoked as part of the `npm hardhat deploy-all --network […]` and `npx hardhat release` (all networks) command.

### Use package in other local repo

Edit package.json dependency in other local repo to point to this folder. Like this (one level up), if the two projects foleders reside side by side.

```json
    "@symfoni/cbdc-sandbox-contracts-shared": "file:../cbdc-sandbox-contracts",
```

## Setup full sandbox CBDC ecosystem

The latest sandbox iteration of the CBDC ecosystem comprises the following components:

1. [Contracts](https://github.com/norges-bank/cbdc-sandbox-contracts): Encompasses smart contracts, a localized blockchain, and a deployment system.
2. [Frontend-v2](https://github.com/norges-bank/cbdc-sandbox-frontend-v2): Features a web-based user interface for token management, as well as a server dedicated to verifying verfiable credentials.
3. [VC-Issuer](https://github.com/norges-bank/cbdc-sandbox-vc-issuer): Consists of a web frontend that allows users to log in through ID-porten, accompanied by a backend responsible for issuing verfiable credentials.
4. [Contact Registry](https://github.com/norges-bank/cbdc-sandbox-contact-registry): This section includes a database and backend infrastructure, enabling applications to efficiently query contacts as needed.

To set up each component, follow the instructions provided in their respective repositories.

1. Begin by configuring the contracts. Start the local blockchain and deploy the smart contracts accordingly.

2. Next, establish the VC-issuer. The URL for this application will be utilized within frontend-v2, directing users to a location where they can obtain verifiable credentials.

3. Proceed to set up the contact-registry. Frontend-v2 will utilize its URL in the user interface to enable contact queries based on phone numbers, IDs, or email addresses.

4. Finally, configure frontend-v2 using the URLs obtained during the VC-issuer and contact-registry setup processes. By default, the frontend will employ a [published package from the contracts project](https://www.npmjs.com/package/@symfoni/cbdc-sandbox-contracts-shared). To release new packages, use the contracts repository. The contracts deployed on the local blockchain are deterministic, ensuring that smart contracts retain the same addresses (though certain alterations may result in changes, such as the order of deployed addresses).
