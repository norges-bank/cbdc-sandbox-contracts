# Smart contracts for the Norges Bank CBDC sandbox

## Disclaimer

This a sandbox project and not intended for production; use at your own risk.

## Running locally

### Installation

The repository may be cloned locally and installation triggered as follows.
```shell
$ git clone git@github.com:nahmii/nb-sandbox-contracts.git
$ cd nb-sandbox-contracts
$ npm install --ignore-scripts
```

> **_NOTE:_** The reason for installing with the `--ignore-scripts` option is first and foremost to prevent the post-install script of package _[@consensys/universal-token](https://github.com/ConsenSys/UniversalToken)_ from running. For the usage of _@consensys/universal-token_ as dependency in this project the execution of `postinstall` is obsolete.

### Compilation

The smart contract code base may be compiled with
```shell
$ npm run compile
```

### Testing

In order to take the smart contracts for a test drive you may invoke
```shell
$ npm run test
```