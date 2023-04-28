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
