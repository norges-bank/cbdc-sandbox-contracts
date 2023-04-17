# Smart contracts for the Norges Bank CBDC sandbox

## Disclaimer

This a sandbox project and not intended for production; use at your own risk.

## Running locally

### Installation

The repository may be cloned locally and installation triggered as follows.

```shell
git clone git@github.com:nahmii/nb-sandbox-contracts.git
cd nb-sandbox-contracts
npm install --ignore-scripts
```

> **_NOTE:_** The reason for installing with the `--ignore-scripts` option is first and foremost to prevent the post-install script of package _[@consensys/universal-token](https://github.com/ConsenSys/UniversalToken)_ from running. For the usage of _@consensys/universal-token_ as dependency in this project the execution of `postinstall` is obsolete.

### Compilation

The smart contract code base may be compiled with

```shell
npm run compile
```

### Testing

In order to take the smart contracts for a test drive you may invoke

```shell
npx hardhat test --parallel
```

#### Development

To run development environment with hardhat `Cmd + Shift + P` and select `Tasks: Run Task` and select `dev`.

#### Build NPM package

To release NPM package, do

- Create an .npmrc file and add this line `//npm.pkg.github.com/:_authToken=YOUR_AUTH_TOKEN`
- Create a token at [https://github.com/settings/tokens](https://github.com/settings/tokens)
- In .npmrc, change YOUR_AUTH_TOKEN with your generated token.
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

### Use in local development

Edit package.json dependency of your repot to point to this repo. Like this (one level up), if the two projects foleders reside side by side.

```json
    "@symfoni/cbdc-contracts": "file:../cbdc-sandbox-contracts-shared",
```
