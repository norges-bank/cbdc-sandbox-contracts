import { expect } from "chai";
import * as hre from "hardhat";
import { BigNumber, Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { ethers } = hre;

const getWei = (value: number) => ethers.utils.parseEther(value.toString());

const transferValues = [
  getWei(10),
  getWei(20),
  getWei(30),
  getWei(40),
  getWei(50),
];

const getTotalTransferValue = () => {
  let total = transferValues[0];
  for (let i = 1; i < transferValues.length; i++) {
    total = total.add(transferValues[i]);
  }
  return total;
};

const cbsControllers = ["0xBc5C5A1C8AD76d40Ce8742e404a053ecE7B6253c"];

const cbsPartitions = [
  "0x7265736572766564000000000000000000000000000000000000000000000000",
  "0x6973737565640000000000000000000000000000000000000000000000000000",
  "0x6c6f636b65640000000000000000000000000000000000000000000000000000",
];

describe("DisperseWithData", function () {
  let signer: SignerWithAddress;
  let recipients: SignerWithAddress[];
  let disperseWithData: Contract;
  let cbToken: Contract;
  let cbsToken: Contract;

  async function defineFixture() {
    [signer, ...recipients] = (await hre.ethers.getSigners()).slice(0, 6);

    const CBToken = await ethers.getContractFactory("CBToken");
    const cbToken = await CBToken.deploy("CBToken", "CBT", 18);
    await cbToken.deployed();

    const { chainId } = await ethers.provider.getNetwork();

    const CBSToken = await ethers.getContractFactory("CBSToken");
    const cbsToken = await CBSToken.deploy(
      "CBSToken",
      "CBST",
      1,
      cbsControllers,
      cbsPartitions,
      chainId
    );
    await cbToken.deployed();
    await cbsToken.issue(signer.address, getWei(1_000_000), "0x");

    const DisperseWithData = await ethers.getContractFactory(
      "DisperseWithData"
    );
    const disperseWithData = await DisperseWithData.deploy();
    await disperseWithData.deployed();

    return { signer, recipients, cbToken, cbsToken, disperseWithData };
  }

  describe("#getDataLength()", async () => {
    beforeEach(async () => {
      ({ disperseWithData } = await loadFixture(defineFixture));
    });

    it("should return the length of the messageData state variable", async () => {
      const dataLength = await disperseWithData.getDataLength();
      expect(dataLength).to.equal(ethers.constants.Zero);
    });
  });

  describe("#disperseEther()", async () => {
    let recipientPreBalances: BigNumber[];
    let recipientAddresses: string[];

    beforeEach(async () => {
      ({ recipients, disperseWithData } = await loadFixture(defineFixture));

      recipientPreBalances = await Promise.all(
        recipients.map((recipient) => recipient.getBalance("latest"))
      );
      recipientAddresses = recipients.map((recipient) => recipient.address);
    });

    it("should disperse ETH transfers by transfer to each recipient", async () => {
      await disperseWithData.disperseEther(recipientAddresses, transferValues, {
        value: ethers.utils.parseEther("1000"),
      });

      const expectedDataLength = await disperseWithData.getDataLength();
      expect(expectedDataLength).to.equal(ethers.constants.Zero);

      for (const [i, recipient] of recipients.entries()) {
        const postBalance = await recipient.getBalance("latest");
        expect(postBalance).to.equal(
          recipientPreBalances[i].add(transferValues[i])
        );
      }
    });
  });

  describe("#disperseEtherWithData()", async () => {
    let recipientPreBalances: BigNumber[];
    let recipientAddresses: string[];
    let data: string;

    beforeEach(async () => {
      ({ recipients, disperseWithData } = await loadFixture(defineFixture));

      recipientPreBalances = await Promise.all(
        recipients.map((recipient) => recipient.getBalance("latest"))
      );
      recipientAddresses = recipients.map((recipient) => recipient.address);

      data = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    });

    it("should disperse ETH transfers by transfer to each recipient", async () => {
      await disperseWithData.disperseEtherWithData(
        recipientAddresses,
        transferValues,
        data,
        {
          value: ethers.utils.parseEther("1000"),
        }
      );

      const expectedDataLength = await disperseWithData.getDataLength();
      expect(expectedDataLength).to.equal(ethers.constants.One);
      const expectedData = await disperseWithData.data(ethers.constants.Zero);
      expect(expectedData).to.equal(data);

      for (const [i, recipient] of recipients.entries()) {
        const postBalance = await recipient.getBalance("latest");
        expect(postBalance).to.equal(
          recipientPreBalances[i].add(transferValues[i])
        );
      }
    });
  });

  describe("#disperseToken()", async () => {
    let recipientAddresses: string[];

    describe("with ERC20 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC20 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseToken(
          cbToken.address,
          recipientAddresses,
          transferValues
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.Zero);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });

    describe("with ERC1400 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbsToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbsToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC1400 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseToken(
          cbsToken.address,
          recipientAddresses,
          transferValues
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.Zero);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbsToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });
  });

  describe("#disperseTokenWithData()", async () => {
    let recipientAddresses: string[];
    let data: string;

    beforeEach(async () => {
      data = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    });

    describe("with ERC20 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC20 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseTokenWithData(
          cbToken.address,
          recipientAddresses,
          transferValues,
          data
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.One);
        const expectedData = await disperseWithData.data(ethers.constants.Zero);
        expect(expectedData).to.equal(data);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });

    describe("with ERC1400 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbsToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbsToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC1400 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseTokenWithData(
          cbsToken.address,
          recipientAddresses,
          transferValues,
          data
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.One);
        const expectedData = await disperseWithData.data(ethers.constants.Zero);
        expect(expectedData).to.equal(data);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbsToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });
  });

  describe("#disperseTokenSimple()", async () => {
    let recipientAddresses: string[];

    describe("with ERC20 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC20 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseTokenSimple(
          cbToken.address,
          recipientAddresses,
          transferValues
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.Zero);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });

    describe("with ERC1400 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbsToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbsToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC1400 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseTokenSimple(
          cbsToken.address,
          recipientAddresses,
          transferValues
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.Zero);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbsToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });
  });

  describe("#disperseTokenWithDataSimple()", async () => {
    let recipientAddresses: string[];
    let data: string;

    beforeEach(async () => {
      data = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    });

    describe("with ERC20 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC20 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseTokenWithDataSimple(
          cbToken.address,
          recipientAddresses,
          transferValues,
          data
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.One);
        const expectedData = await disperseWithData.data(ethers.constants.Zero);
        expect(expectedData).to.equal(data);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });

    describe("with ERC1400 token", async () => {
      beforeEach(async () => {
        ({ recipients, disperseWithData, cbsToken } = await loadFixture(
          defineFixture
        ));

        recipientAddresses = recipients.map((recipient) => recipient.address);

        await cbsToken.approve(
          disperseWithData.address,
          getTotalTransferValue()
        );
      });

      it("should disperse ERC1400 transfers by transfer to each recipient", async () => {
        await disperseWithData.disperseTokenWithDataSimple(
          cbsToken.address,
          recipientAddresses,
          transferValues,
          data
        );

        const expectedDataLength = await disperseWithData.getDataLength();
        expect(expectedDataLength).to.equal(ethers.constants.One);
        const expectedData = await disperseWithData.data(ethers.constants.Zero);
        expect(expectedData).to.equal(data);

        for (const [i, recipientAddress] of recipientAddresses.entries()) {
          const balance = await cbsToken.balanceOf(recipientAddress);
          expect(balance).to.equal(transferValues[i]);
        }
      });
    });
  });
});
