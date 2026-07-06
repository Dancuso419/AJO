import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AjoToken, AjoToken__factory, ConfidentialAjo, ConfidentialAjo__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

const OPERATOR_UNTIL = 4102444800; // year 2100 (uint48 timestamp)

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
  dave: HardhatEthersSigner;
};

const CONTRIB = 100n;
const ROUND_DURATION = 3600n;

async function deployFixture() {
  const tokenFactory = (await ethers.getContractFactory("AjoToken")) as AjoToken__factory;
  const token = (await tokenFactory.deploy()) as AjoToken;
  const tokenAddress = await token.getAddress();

  const ajoFactory = (await ethers.getContractFactory("ConfidentialAjo")) as ConfidentialAjo__factory;
  const ajo = (await ajoFactory.deploy()) as ConfidentialAjo;
  const ajoAddress = await ajo.getAddress();

  return { token, tokenAddress, ajo, ajoAddress };
}

describe("ConfidentialAjo", function () {
  let signers: Signers;
  let token: AjoToken;
  let tokenAddress: string;
  let ajo: ConfidentialAjo;
  let ajoAddress: string;
  let order: string[];

  before(async function () {
    const s = await ethers.getSigners();
    signers = { deployer: s[0], alice: s[1], bob: s[2], carol: s[3], dave: s[4] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on the local FHEVM mock`);
      this.skip();
    }
    ({ token, tokenAddress, ajo, ajoAddress } = await deployFixture());
    order = [signers.alice.address, signers.bob.address, signers.carol.address];
  });

  describe("createGroup", function () {
    it("returns groupId 0 for the first group and increments groupCount", async function () {
      const groupId = await ajo.createGroup.staticCall(3, CONTRIB, ROUND_DURATION, order, tokenAddress);
      expect(groupId).to.eq(0);

      await (await ajo.createGroup(3, CONTRIB, ROUND_DURATION, order, tokenAddress)).wait();
      expect(await ajo.groupCount()).to.eq(1);
    });

    it("stores the group config and payout order", async function () {
      await (await ajo.createGroup(3, CONTRIB, ROUND_DURATION, order, tokenAddress)).wait();

      const g = await ajo.groups(0);
      expect(g.memberCount).to.eq(3);
      expect(g.contributionAmount).to.eq(CONTRIB);
      expect(g.roundDuration).to.eq(ROUND_DURATION);
      expect(g.currentRound).to.eq(0); // not started until full
      expect(g.token).to.eq(tokenAddress);
      expect(g.active).to.eq(false);

      expect(await ajo.getPayoutOrder(0)).to.deep.eq(order);
    });

    it("reverts when memberCount does not equal payoutOrder length", async function () {
      await expect(
        ajo.createGroup(4, CONTRIB, ROUND_DURATION, order, tokenAddress),
      ).to.be.revertedWith("memberCount != payoutOrder length");
    });

    it("reverts when memberCount is less than 2", async function () {
      await expect(
        ajo.createGroup(1, CONTRIB, ROUND_DURATION, [signers.alice.address], tokenAddress),
      ).to.be.revertedWith("group too small");
    });

    it("emits GroupCreated", async function () {
      await expect(ajo.connect(signers.alice).createGroup(3, CONTRIB, ROUND_DURATION, order, tokenAddress))
        .to.emit(ajo, "GroupCreated")
        .withArgs(0, signers.alice.address, 3, tokenAddress);
    });
  });

  describe("joinGroup", function () {
    beforeEach(async function () {
      await (await ajo.createGroup(3, CONTRIB, ROUND_DURATION, order, tokenAddress)).wait();
    });

    it("lets an invited member join and records membership", async function () {
      await expect(ajo.connect(signers.alice).joinGroup(0))
        .to.emit(ajo, "MemberJoined")
        .withArgs(0, signers.alice.address, 0);

      expect(await ajo.isMember(0, signers.alice.address)).to.eq(true);
      expect(await ajo.memberCountJoined(0)).to.eq(1);
    });

    it("reverts if the caller is not in the payout order", async function () {
      await expect(ajo.connect(signers.dave).joinGroup(0)).to.be.revertedWith("not invited");
    });

    it("reverts if the caller already joined", async function () {
      await (await ajo.connect(signers.alice).joinGroup(0)).wait();
      await expect(ajo.connect(signers.alice).joinGroup(0)).to.be.revertedWith("already joined");
    });

    it("reverts for a non-existent group", async function () {
      await expect(ajo.connect(signers.alice).joinGroup(99)).to.be.revertedWith("no such group");
    });

    it("activates the group and starts round 1 when the last member joins", async function () {
      await (await ajo.connect(signers.alice).joinGroup(0)).wait();
      await (await ajo.connect(signers.bob).joinGroup(0)).wait();

      // group not yet active with 2/3 joined
      expect((await ajo.groups(0)).active).to.eq(false);

      await expect(ajo.connect(signers.carol).joinGroup(0)).to.emit(ajo, "GroupStarted").withArgs(0);

      const g = await ajo.groups(0);
      expect(g.active).to.eq(true);
      expect(g.currentRound).to.eq(1);
      expect(g.roundStartTime).to.be.gt(0);
    });
  });

  describe("contribute", function () {
    // Create a full, active group and give every member tokens + operator approval.
    async function startGroupWithTokens() {
      await (await ajo.createGroup(3, CONTRIB, ROUND_DURATION, order, tokenAddress)).wait();
      for (const m of [signers.alice, signers.bob, signers.carol]) {
        await (await ajo.connect(m).joinGroup(0)).wait();
        await (await token.mint(m.address, 1000)).wait();
        await (await token.connect(m).setOperator(ajoAddress, OPERATOR_UNTIL)).wait();
      }
    }

    async function encFor(user: HardhatEthersSigner, amount: bigint) {
      return fhevm.createEncryptedInput(ajoAddress, user.address).add64(amount).encrypt();
    }

    beforeEach(async function () {
      await startGroupWithTokens();
    });

    it("reverts if the group is not active", async function () {
      // fresh group (id 1) with nobody joined yet -> not active
      await (await ajo.createGroup(2, CONTRIB, ROUND_DURATION, [signers.alice.address, signers.bob.address], tokenAddress)).wait();
      const enc = await encFor(signers.alice, CONTRIB);
      await expect(
        ajo.connect(signers.alice).contribute(1, enc.handles[0], enc.inputProof),
      ).to.be.revertedWith("group not active");
    });

    it("reverts if the caller is not a member", async function () {
      const enc = await encFor(signers.dave, CONTRIB);
      await expect(
        ajo.connect(signers.dave).contribute(0, enc.handles[0], enc.inputProof),
      ).to.be.revertedWith("not a member");
    });

    it("sets the public paid flag and emits Contributed", async function () {
      const enc = await encFor(signers.alice, CONTRIB);
      await expect(ajo.connect(signers.alice).contribute(0, enc.handles[0], enc.inputProof))
        .to.emit(ajo, "Contributed")
        .withArgs(0, 1, signers.alice.address);

      expect(await ajo.hasPaidThisRound(0, 1, signers.alice.address)).to.eq(true);
    });

    it("records the contribution in the member's own decryptable history", async function () {
      const enc = await encFor(signers.alice, CONTRIB);
      await (await ajo.connect(signers.alice).contribute(0, enc.handles[0], enc.inputProof)).wait();

      const handle = await ajo.connect(signers.alice).getMyEncryptedContributionHistory(0);
      const clear = await fhevm.userDecryptEuint(FhevmType.euint64, handle, ajoAddress, signers.alice);
      expect(clear).to.eq(CONTRIB);
    });

    it("keeps a member's contribution private from other members", async function () {
      const enc = await encFor(signers.alice, CONTRIB);
      await (await ajo.connect(signers.alice).contribute(0, enc.handles[0], enc.inputProof)).wait();

      const aliceHandle = await ajo.connect(signers.alice).getMyEncryptedContributionHistory(0);

      // Bob is NOT ACL-authorized on Alice's ciphertext -> user decryption must fail for him.
      let bobCouldDecrypt = false;
      try {
        await fhevm.userDecryptEuint(FhevmType.euint64, aliceHandle, ajoAddress, signers.bob);
        bobCouldDecrypt = true;
      } catch {
        bobCouldDecrypt = false;
      }
      expect(bobCouldDecrypt).to.eq(false);
    });

    it("reverts if the member already paid this round", async function () {
      const enc1 = await encFor(signers.alice, CONTRIB);
      await (await ajo.connect(signers.alice).contribute(0, enc1.handles[0], enc1.inputProof)).wait();

      const enc2 = await encFor(signers.alice, CONTRIB);
      await expect(
        ajo.connect(signers.alice).contribute(0, enc2.handles[0], enc2.inputProof),
      ).to.be.revertedWith("already paid this round");
    });
  });

  describe("payout & rounds", function () {
    const members = () => [signers.alice, signers.bob, signers.carol];

    async function startGroupWithTokens() {
      await (await ajo.createGroup(3, CONTRIB, ROUND_DURATION, order, tokenAddress)).wait();
      for (const m of members()) {
        await (await ajo.connect(m).joinGroup(0)).wait();
        await (await token.mint(m.address, 1000)).wait();
        await (await token.connect(m).setOperator(ajoAddress, OPERATOR_UNTIL)).wait();
      }
    }

    async function allContribute() {
      for (const m of members()) {
        const enc = await fhevm.createEncryptedInput(ajoAddress, m.address).add64(CONTRIB).encrypt();
        await (await ajo.connect(m).contribute(0, enc.handles[0], enc.inputProof)).wait();
      }
    }

    async function decryptPayout(user: HardhatEthersSigner) {
      const handle = await ajo.connect(user).getMyEncryptedPayoutHistory(0);
      return fhevm.userDecryptEuint(FhevmType.euint64, handle, ajoAddress, user);
    }

    beforeEach(async function () {
      await startGroupWithTokens();
    });

    it("pays the round-1 recipient the full pool and advances to round 2", async function () {
      // Two contributions: no payout yet, still round 1.
      for (const m of [signers.alice, signers.bob]) {
        const enc = await fhevm.createEncryptedInput(ajoAddress, m.address).add64(CONTRIB).encrypt();
        await (await ajo.connect(m).contribute(0, enc.handles[0], enc.inputProof)).wait();
      }
      expect((await ajo.groups(0)).currentRound).to.eq(1);

      // Third contribution completes the round -> auto payout to payoutOrder[0] = alice.
      const encC = await fhevm.createEncryptedInput(ajoAddress, signers.carol.address).add64(CONTRIB).encrypt();
      await expect(ajo.connect(signers.carol).contribute(0, encC.handles[0], encC.inputProof))
        .to.emit(ajo, "PayoutExecuted")
        .withArgs(0, 1, signers.alice.address);

      // Round advanced; new round has a clean paid state.
      expect((await ajo.groups(0)).currentRound).to.eq(2);
      expect(await ajo.hasPaidThisRound(0, 2, signers.alice.address)).to.eq(false);

      // Recipient can decrypt their payout = 3 * CONTRIB.
      expect(await decryptPayout(signers.alice)).to.eq(CONTRIB * 3n);
    });

    it("runs a full 3-round cycle paying each member once, then completes the group", async function () {
      await allContribute(); // round 1 -> alice
      await allContribute(); // round 2 -> bob
      await allContribute(); // round 3 -> carol

      expect(await decryptPayout(signers.alice)).to.eq(CONTRIB * 3n);
      expect(await decryptPayout(signers.bob)).to.eq(CONTRIB * 3n);
      expect(await decryptPayout(signers.carol)).to.eq(CONTRIB * 3n);

      const g = await ajo.groups(0);
      expect(g.active).to.eq(false); // all rounds done
    });

    it("only the payout recipient can decrypt their payout, not others", async function () {
      await allContribute(); // round 1 -> alice is recipient

      const aliceHandle = await ajo.connect(signers.alice).getMyEncryptedPayoutHistory(0);
      let bobCouldDecrypt = false;
      try {
        await fhevm.userDecryptEuint(FhevmType.euint64, aliceHandle, ajoAddress, signers.bob);
        bobCouldDecrypt = true;
      } catch {
        bobCouldDecrypt = false;
      }
      expect(bobCouldDecrypt).to.eq(false);
    });

    describe("advanceRoundIfReady (default handling)", function () {
      it("reverts if the round is not over and not everyone has paid", async function () {
        const enc = await fhevm.createEncryptedInput(ajoAddress, signers.alice.address).add64(CONTRIB).encrypt();
        await (await ajo.connect(signers.alice).contribute(0, enc.handles[0], enc.inputProof)).wait();

        await expect(ajo.advanceRoundIfReady(0)).to.be.revertedWith("round not over");
      });

      it("flags missing members as defaulted and advances the round after expiry", async function () {
        // Only alice and bob pay; carol does not.
        for (const m of [signers.alice, signers.bob]) {
          const enc = await fhevm.createEncryptedInput(ajoAddress, m.address).add64(CONTRIB).encrypt();
          await (await ajo.connect(m).contribute(0, enc.handles[0], enc.inputProof)).wait();
        }

        // Move past the round duration.
        await ethers.provider.send("evm_increaseTime", [Number(ROUND_DURATION) + 1]);
        await ethers.provider.send("evm_mine", []);

        await expect(ajo.advanceRoundIfReady(0))
          .to.emit(ajo, "MemberDefaulted")
          .withArgs(0, 1, signers.carol.address);

        expect(await ajo.isDefaulted(0, 1, signers.carol.address)).to.eq(true);
        expect(await ajo.isDefaulted(0, 1, signers.alice.address)).to.eq(false);
        expect((await ajo.groups(0)).currentRound).to.eq(2);
      });
    });
  });
});
